import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { ProviderEvent } from "@/adapters/types";
import { handleMembershipEvent } from "@/modules/memberships/events";
import { confirmPaidBooking } from "@/modules/scheduling/booking-payment";
import { markFormResponsePaid } from "@/modules/forms/payment";
import { grantEntitlementsForOrder } from "@/modules/marketplace/entitlements";
import { disputes, entitlements, orderItems, orders, productVariants, products, stripeEvents } from "./schema";

/**
 * The ONE order/dispute state machine. Every Stripe webhook flows through
 * here after signature verification. Idempotent: an event id already in
 * the ledger is acked and skipped. Inventory is decremented ONLY here,
 * inside the paid transition — never from client-facing code.
 */
export async function handleStripeEvent(event: ProviderEvent): Promise<void> {
  // Idempotency: claim the event id, or bail if already recorded.
  const claimed = await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type, payload: event.raw })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id });
  if (!claimed.length) return; // duplicate delivery — already handled

  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data);
      break;
    case "checkout.session.expired":
      await onCheckoutExpired(event.data);
      break;
    case "charge.refunded":
      await onRefunded(event.data);
      break;
    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed":
      await onDispute(event.data);
      break;
    case "radar.early_fraud_warning.created":
      await onEarlyFraudWarning(event.data);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.paid":
    case "invoice.payment_failed":
      // Membership billing lives in its own module; the order handlers above
      // ignore subscription checkouts (no matching order row).
      await handleMembershipEvent(event.type, event.data);
      break;
    default:
      break; // recorded but not acted on
  }

  await db
    .update(stripeEvents)
    .set({ processedAt: Date.now() })
    .where(eq(stripeEvents.id, event.id));
}

async function onCheckoutCompleted(session: Record<string, unknown>) {
  const ref = session.client_reference_id as string | undefined;
  if (!ref) return;

  // Paid bookings ride the same checkout webhook; a booking session is tagged
  // with metadata.kind = "booking" and carries the manage code as the ref.
  const metadata = (session.metadata as Record<string, unknown> | undefined) ?? {};
  if (metadata.kind === "booking") {
    await confirmPaidBooking(ref, (session.payment_intent as string) ?? null);
    return;
  }

  // Form payments ride the same checkout webhook too; a form-payment session
  // is tagged with metadata.kind = "form-payment" and carries the response id
  // as the ref (see modules/forms/payment.ts).
  if (metadata.kind === "form-payment") {
    await markFormResponsePaid(ref, (session.payment_intent as string) ?? null);
    return;
  }

  // Donations ride the same checkout webhook too; a donation session is
  // tagged with metadata.kind = "donation" and carries the donation order id
  // as the ref. No fulfillment/inventory applies — the order has no real
  // product/variant line items, so it goes straight to "paid" (a status the
  // shop order flow never uses, keeping donations out of the
  // unfulfilled/fulfilled tabs). The final amount is customer-chosen at
  // Stripe Checkout (custom_unit_amount), so totalCents is reconciled here.
  if (metadata.kind === "donation") {
    const donationOrder = await db.query.orders.findFirst({ where: eq(orders.id, ref) });
    if (!donationOrder || donationOrder.status !== "pending") return;
    await db
      .update(orders)
      .set({
        status: "paid",
        totalCents: (session.amount_total as number) ?? donationOrder.totalCents,
        stripePaymentIntentId: (session.payment_intent as string) ?? null,
        stripeCheckoutSessionId: (session.id as string) ?? null,
      })
      .where(eq(orders.id, donationOrder.id));
    return;
  }

  const order = await db.query.orders.findFirst({ where: eq(orders.id, ref) });
  if (!order || order.status !== "pending") return;

  // Stripe Tax breakdown — captured at checkout completion so the local order
  // carries the per-jurisdiction tax detail for refunds + reports. Shape:
  //   total_details.amount_tax: number
  //   total_details.breakdown.tax: [{ amount, description, tax_rate: {id} }]
  // (See https://docs.stripe.com/api/checkout/sessions/object)
  const totalDetails = (session.total_details as Record<string, unknown> | undefined) ?? {};
  const taxCents = (totalDetails.amount_tax as number) ?? 0;
  const breakdownTax = (totalDetails.breakdown as { tax?: Array<Record<string, unknown>> } | undefined)?.tax ?? [];
  const taxBreakdown = breakdownTax.map((t) => ({
    jurisdiction: String(t.description ?? t.jurisdiction ?? "tax"),
    amount: (t.amount as number) ?? 0,
    taxRateId: typeof t.tax_rate === "string" ? t.tax_rate : undefined,
  }));

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "unfulfilled",
        stripePaymentIntentId: (session.payment_intent as string) ?? null,
        stripeCheckoutSessionId: (session.id as string) ?? null,
        taxCents,
        taxBreakdown,
      })
      .where(eq(orders.id, order.id));

    // Decrement inventory for tracked products/variants, transactionally.
    // This is the ONE inventory decrement point (paid transition) — never
    // repeated at fulfillment time, which only marks status/tracking.
    const items = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, order.id),
    });
    for (const item of items) {
      if (item.variantId) {
        await tx
          .update(productVariants)
          .set({ inventory: sql`max(0, ${productVariants.inventory} - ${item.qty})` })
          .where(eq(productVariants.id, item.variantId));
      } else if (item.productId) {
        await tx
          .update(products)
          .set({ inventory: sql`max(0, ${products.inventory} - ${item.qty})`, updatedAt: Date.now() })
          .where(eq(products.id, item.productId));
      }
    }
  });

  // Grant entitlements for any access-granting products in this order.
  // Runs outside the inventory transaction (it's an append-only insert with
  // onConflictDoNothing idempotency). Skipped for guest orders (no personId).
  await grantEntitlementsForOrder(order.id);
}

/**
 * Handles refunds issued from anywhere (this app's Refund button, or
 * directly from the Stripe Dashboard) — reconciles refundedCents/status
 * from the charge's own amount_refunded vs amount so both paths agree.
 *
 * Tax reversal: Stripe Tax auto-reverses the tax portion when a refund is
 * issued through Stripe. We track the reversed tax locally so reports stay
 * accurate. The reversed tax is approximated from the refund fraction when
 * Stripe doesn't break it out on the charge object (the Tax Transactions
 * API has the exact number; this is the conservative ledger entry).
 */
async function onRefunded(charge: Record<string, unknown>) {
  const pi = charge.payment_intent as string | undefined;
  if (!pi) return;
  const order = await db.query.orders.findFirst({ where: eq(orders.stripePaymentIntentId, pi) });
  if (!order) return;
  const refundedCents = (charge.amount_refunded as number) ?? order.refundedCents;
  const totalCents = (charge.amount as number) ?? order.totalCents;
  // Approximate reversed tax proportionally — the exact figure lives in the
  // Stripe Tax Transaction (created at checkout); the charge object doesn't
  // carry per-line tax. Proportional is correct for full refunds and a safe
  // conservative estimate for partial ones.
  const refundFraction = totalCents > 0 ? refundedCents / totalCents : 0;
  const taxRefundedCents = Math.round(order.taxCents * refundFraction);
  await db
    .update(orders)
    .set({
      refundedCents,
      taxRefundedCents,
      status: refundedCents >= totalCents ? "refunded" : order.status,
    })
    .where(eq(orders.id, order.id));

  // Revoke entitlements on full refunds so refunded users lose access to
  // paid content. Partial refunds don't revoke (the buyer keeps the product).
  if (refundedCents >= totalCents && totalCents > 0) {
    await db
      .update(entitlements)
      .set({ revokedAt: Date.now() })
      .where(eq(entitlements.orderId, order.id));
  }
}

/** A pending checkout the customer never completed — release it, not inventory (never reserved). */
async function onCheckoutExpired(session: Record<string, unknown>) {
  const ref = session.client_reference_id as string | undefined;
  if (!ref) return;
  const order = await db.query.orders.findFirst({ where: eq(orders.id, ref) });
  if (!order || order.status !== "pending") return;
  await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
}

/**
 * Stripe Radar flagged this charge as likely fraudulent, after the fact.
 * Per Stripe's own guidance this is a merchant judgment call, not an
 * auto-refund — surfaced via the same dispute-shaped UI so the admin sees
 * a "review before shipping" prompt without new UI plumbing.
 */
async function onEarlyFraudWarning(warning: Record<string, unknown>) {
  const pi = (warning.payment_intent as string) ?? undefined;
  const order = pi
    ? await db.query.orders.findFirst({ where: eq(orders.stripePaymentIntentId, pi) })
    : null;
  if (!order) return;
  await db
    .insert(disputes)
    .values({
      orderId: order.id,
      stripeDisputeId: warning.id as string,
      reason: (warning.fraud_type as string) ?? "",
      status: "early_fraud_warning",
      amountCents: (warning.charge_amount as number) ?? 0,
    })
    .onConflictDoNothing();
}

async function onDispute(dispute: Record<string, unknown>) {
  const pi = (dispute.payment_intent as string) ?? undefined;
  const order = pi
    ? await db.query.orders.findFirst({ where: eq(orders.stripePaymentIntentId, pi) })
    : null;
  if (order) {
    await db.update(orders).set({ status: "disputed" }).where(eq(orders.id, order.id));
  }
  const evidenceDue = (dispute.evidence_details as { due_by?: number } | undefined)?.due_by;
  await db
    .insert(disputes)
    .values({
      orderId: order?.id ?? "",
      stripeDisputeId: dispute.id as string,
      reason: (dispute.reason as string) ?? "",
      status: (dispute.status as string) ?? "needs_response",
      amountCents: (dispute.amount as number) ?? 0,
      evidenceDueAt: evidenceDue ? evidenceDue * 1000 : null,
    })
    .onConflictDoUpdate({
      target: disputes.stripeDisputeId,
      set: {
        status: (dispute.status as string) ?? "needs_response",
      },
    });
}
