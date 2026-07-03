"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { payments } from "@/adapters/payments";
import { orderItems, orders, productVariants, products } from "./schema";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const trackingSchema = z.string().max(120).default("");

const invalidate = () => {
  updateTag("orders");
  updateTag("storefront");
};

/**
 * Mark an order fulfilled (editor OK) and adjust inventory: each line item
 * decrements its variant's or product's tracked stock. Records the tracking
 * number. There is deliberately no manual pending→paid — payment state is
 * owned by the Stripe webhook state machine.
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

  const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, id) });
  for (const item of items) {
    if (item.variantId) {
      const variant = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, item.variantId),
      });
      if (variant) {
        await db
          .update(productVariants)
          .set({ inventory: Math.max(0, variant.inventory - item.qty) })
          .where(eq(productVariants.id, item.variantId));
      }
    } else if (item.productId) {
      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });
      if (product && product.trackInventory) {
        await db
          .update(products)
          .set({ inventory: Math.max(0, product.inventory - item.qty), updatedAt: Date.now() })
          .where(eq(products.id, item.productId));
      }
    }
  }

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

/**
 * Refund an order (owner-only). Calls the payments adapter, then sets the
 * order refunded optimistically. The webhook reconciles the final state.
 */
export async function refundOrder(id: string): Promise<Result> {
  const user = await requireUser("owner");
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return { ok: false, error: "Order not found" };
  if (!order.stripePaymentIntentId) {
    return { ok: false, error: "No payment to refund on this order" };
  }
  if (order.status === "refunded") return { ok: true };

  try {
    await payments.refund(order.stripePaymentIntentId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Refund failed" };
  }

  await db.update(orders).set({ status: "refunded" }).where(eq(orders.id, id));
  await writeAudit({
    userId: user.id,
    action: "order.refund",
    ownerType: "order",
    ownerId: id,
    meta: { paymentIntentId: order.stripePaymentIntentId, amountCents: order.totalCents },
  });
  invalidate();
  return { ok: true };
}
