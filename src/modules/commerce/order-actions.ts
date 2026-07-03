"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { payments } from "@/adapters/payments";
import { orders } from "./schema";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const trackingSchema = z.string().max(120).default("");

const invalidate = () => {
  updateTag("orders");
  updateTag("storefront");
};

/**
 * Mark an order fulfilled (editor OK) and record the tracking number.
 * Inventory is NOT touched here — it's decremented exactly once, at the
 * pending→unfulfilled paid transition in the Stripe webhook state machine
 * (stripe-events.ts's onCheckoutCompleted), so fulfillment never
 * double-decrements stock. There is deliberately no manual pending→paid
 * either — payment state is owned by that same webhook state machine.
 */
export async function fulfillOrder(id: string, tracking: unknown): Promise<Result> {
  const user = await requireUser();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status === "refunded" || order.status === "disputed") {
    return { ok: false, error: `Cannot fulfill a ${order.status} order` };
  }
  const parsedTracking = trackingSchema.safeParse(tracking);
  if (!parsedTracking.success) return { ok: false, error: "Invalid tracking number" };

  await db
    .update(orders)
    .set({ status: "fulfilled", tracking: parsedTracking.data })
    .where(eq(orders.id, id));
  await writeAudit({
    userId: user.id,
    action: "order.fulfill",
    ownerType: "order",
    ownerId: id,
    meta: { tracking: parsedTracking.data },
  });
  invalidate();
  return { ok: true };
}

const refundReasonSchema = z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional();

/**
 * Refund an order (owner-only), in full or in part. Calls the payments
 * adapter, then updates the running refunded total; the order only flips
 * to "refunded" once the full total has been refunded (across one or more
 * partial refunds). The webhook reconciles the final state independently.
 */
export async function refundOrder(
  id: string,
  options?: { amountCents?: number; reason?: unknown },
): Promise<Result> {
  const user = await requireUser("owner");
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return { ok: false, error: "Order not found" };
  if (!order.stripePaymentIntentId) {
    return { ok: false, error: "No payment to refund on this order" };
  }
  if (order.status === "refunded") return { ok: true };

  const parsedReason = refundReasonSchema.safeParse(options?.reason);
  if (!parsedReason.success) return { ok: false, error: "Invalid refund reason" };

  const remainingCents = order.totalCents - order.refundedCents;
  let amountCents = options?.amountCents;
  if (amountCents !== undefined) {
    if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > remainingCents) {
      return { ok: false, error: "Invalid refund amount" };
    }
  } else {
    amountCents = remainingCents;
  }

  try {
    await payments.refund(order.stripePaymentIntentId, amountCents, parsedReason.data);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Refund failed" };
  }

  const refundedCents = order.refundedCents + amountCents;
  await db
    .update(orders)
    .set({
      refundedCents,
      status: refundedCents >= order.totalCents ? "refunded" : order.status,
    })
    .where(eq(orders.id, id));
  await writeAudit({
    userId: user.id,
    action: "order.refund",
    ownerType: "order",
    ownerId: id,
    meta: { paymentIntentId: order.stripePaymentIntentId, amountCents, reason: parsedReason.data },
  });
  invalidate();
  return { ok: true };
}
