import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orderItems, orders } from "./schema";

export type OrderSummary = {
  code: string;
  status: string;
  totalCents: number;
  currency: string;
  items: Array<{ name: string; qty: number; unitCents: number }>;
};

/**
 * Look an order up by its unguessable code for the success page. Returns ONLY
 * non-sensitive fields (status, line items, total) — never the email,
 * address, or payment ids. Uncached: the success page is a post-checkout
 * dynamic view keyed on a query param, not shared content.
 */
export async function getOrderByCode(code: string): Promise<OrderSummary | null> {
  const order = await db.query.orders.findFirst({ where: eq(orders.code, code) });
  if (!order) return null;
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, order.id),
  });
  return {
    code: order.code,
    status: order.status,
    totalCents: order.totalCents,
    currency: order.currency,
    items: items.map((i) => ({ name: i.name, qty: i.qty, unitCents: i.unitCents })),
  };
}
