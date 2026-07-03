import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { ProviderEvent } from "@/adapters/types";
import { handleMembershipEvent } from "@/modules/memberships/events";
import { confirmPaidBooking } from "@/modules/scheduling/booking-payment";
import { markFormResponsePaid } from "@/modules/forms/payment";
import { disputes, orderItems, orders, products, stripeEvents } from "./schema";

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
    case "charge.refunded":
      await onRefunded(event.data);
      break;
    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed":
      await onDispute(event.data);
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

  const order = await db.query.orders.findFirst({ where: eq(orders.id, ref) });
  if (!order || order.status !== "pending") return;

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "unfulfilled",
        stripePaymentIntentId: (session.payment_intent as string) ?? null,
        stripeCheckoutSessionId: (session.id as string) ?? null,
      })
      .where(eq(orders.id, order.id));

    // Decrement inventory for tracked products, transactionally.
    const items = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, order.id),
    });
    for (const item of items) {
      if (!item.productId) continue;
      await tx
        .update(products)
        .set({ inventory: sql`max(0, ${products.inventory} - ${item.qty})` })
        .where(eq(products.id, item.productId));
    }
  });
}

async function onRefunded(charge: Record<string, unknown>) {
  const pi = charge.payment_intent as string | undefined;
  if (!pi) return;
  await db
    .update(orders)
    .set({ status: "refunded" })
    .where(eq(orders.stripePaymentIntentId, pi));
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
