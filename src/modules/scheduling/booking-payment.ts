import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payments } from "@/adapters/payments";
import { logActivity } from "@/modules/people/activity";
import { bookings, eventTypes } from "./schema";
import { getExtensionsSettings } from "./settings";
import { sendBookingEmail } from "./reminders";

/**
 * Paid-booking payments. Paid event types (priceCents > 0) route through a
 * Stripe Checkout Session in `payment` mode using the BYO Stripe key already
 * wired into the PaymentsAdapter — no vendor account involved. The booking is
 * held `pending` (occupying its slot) until `checkout.session.completed`
 * promotes it to `confirmed` via the shared webhook state machine.
 *
 * GRACEFUL DEGRADATION: when payments are not configured, paid bookings fall
 * back to a free confirmation (the caller decides) — the platform must work
 * without Stripe keys.
 */

const appUrl = () =>
  (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** True when a Stripe key is present, so paid checkout can run. */
export function paidBookingsEnabled(): boolean {
  return payments.isConfigured();
}

/**
 * Create a Checkout Session for a pending paid booking. Returns the hosted
 * payment URL. `clientReferenceId` + metadata carry the manage code so the
 * webhook can reconcile. Price comes from the event type (server-owned), never
 * the client.
 */
export async function createBookingCheckout(input: {
  code: string;
  eventTypeName: string;
  priceCents: number;
  currency?: string;
  customerEmail: string;
}): Promise<{ url: string }> {
  const session = await payments.createCheckoutSession({
    mode: "payment",
    lineItems: [
      {
        name: input.eventTypeName,
        amountCents: input.priceCents,
        currency: input.currency ?? "usd",
        quantity: 1,
      },
    ],
    successUrl: `${appUrl()}/book/manage/${encodeURIComponent(input.code)}?paid=1`,
    cancelUrl: `${appUrl()}/book/manage/${encodeURIComponent(input.code)}?cancelled=1`,
    customerEmail: input.customerEmail,
    clientReferenceId: input.code,
    metadata: { kind: "booking", code: input.code },
  });
  return { url: session.url };
}

/**
 * Promote a payment-pending booking to confirmed after Stripe reports payment.
 * Idempotent: a booking already confirmed (duplicate webhook) is a no-op. Called
 * by the webhook state machine on `checkout.session.completed` for bookings.
 */
export async function confirmPaidBooking(
  code: string,
  paymentIntentId: string | null,
): Promise<void> {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.code, code),
  });
  if (!booking || booking.status === "confirmed") return;

  await db
    .update(bookings)
    .set({ status: "confirmed", stripePaymentIntentId: paymentIntentId })
    .where(eq(bookings.id, booking.id));

  if (booking.personId) {
    await logActivity(booking.personId, "order", "Paid & confirmed booking", {
      code,
      paymentIntentId,
    });
  }
  try {
    await sendBookingEmail(code, "confirm");
  } catch (err) {
    console.error("[scheduling] confirmation email failed", err);
  }
}

/**
 * Refund a cancelled paid booking when the "payments" extension has
 * `refundOnCancel` on and the cancellation is within any cancel-policy cutoff.
 * Best-effort: a refund failure is logged, never thrown into the cancel flow.
 */
export async function refundBookingIfPolicy(booking: {
  id: string;
  code: string;
  stripePaymentIntentId: string | null;
  date: string;
  time: string;
}): Promise<void> {
  if (!booking.stripePaymentIntentId || !payments.isConfigured()) return;

  const ext = await getExtensionsSettings();
  const paymentsExt = ext.items.find((e) => e.id === "payments");
  const refundOnCancel = Boolean(paymentsExt?.on && paymentsExt.settings.refundOnCancel);
  if (!refundOnCancel) return;

  // Optional cancel-policy cutoff: only refund if cancelling far enough ahead.
  const policy = ext.items.find((e) => e.id === "cancel-policy");
  if (policy?.on) {
    const cutoffHours = Number(policy.settings.cutoffHours ?? 0);
    if (cutoffHours > 0) {
      const startMs = new Date(`${booking.date}T${booking.time}:00Z`).getTime();
      const hoursUntil = (startMs - Date.now()) / 3_600_000;
      if (hoursUntil < cutoffHours) return; // Too late — no refund.
    }
  }

  try {
    await payments.refund(booking.stripePaymentIntentId);
  } catch (err) {
    console.error("[scheduling] booking refund failed", booking.code, err);
  }
}

/** Resolve an event type's price for a booking code (webhook uses this). */
export async function bookingPriceCents(eventTypeId: string): Promise<number> {
  const et = await db.query.eventTypes.findFirst({
    where: eq(eventTypes.id, eventTypeId),
  });
  return et?.priceCents ?? 0;
}
