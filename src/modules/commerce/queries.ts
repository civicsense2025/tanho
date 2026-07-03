import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { people } from "@/modules/people/schema";
import {
  collections,
  disputes,
  orderItems,
  orders,
  productCollections,
  productVariants,
  products,
  shippingZones,
} from "./schema";

export type ProductRow = typeof products.$inferSelect;
export type VariantRow = typeof productVariants.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type DisputeRow = typeof disputes.$inferSelect;
export type ShippingZoneRow = typeof shippingZones.$inferSelect;

export type ProductListItem = ProductRow & { variantCount: number };

/** Admin product list (uncached). Optional text search + status filter. */
export async function listProducts(
  search?: string,
  status?: "draft" | "active",
): Promise<ProductListItem[]> {
  const where = status ? eq(products.status, status) : undefined;
  const rows = await db.query.products.findMany({
    where,
    orderBy: [desc(products.updatedAt)],
  });
  const variants = await db.query.productVariants.findMany();
  const countByProduct = new Map<string, number>();
  for (const v of variants) {
    countByProduct.set(v.productId, (countByProduct.get(v.productId) ?? 0) + 1);
  }
  let items: ProductListItem[] = rows.map((p) => ({
    ...p,
    variantCount: countByProduct.get(p.id) ?? 0,
  }));
  const needle = search?.trim().toLowerCase();
  if (needle) {
    items = items.filter((p) =>
      [p.name, p.slug, p.sku].join(" ").toLowerCase().includes(needle),
    );
  }
  return items;
}

/** One product with its variants and the collection ids it belongs to. */
export async function getProduct(id: string) {
  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) return null;
  const variants = await db.query.productVariants.findMany({
    where: eq(productVariants.productId, id),
  });
  const links = await db.query.productCollections.findMany({
    where: eq(productCollections.productId, id),
  });
  return { product, variants, collectionIds: links.map((l) => l.collectionId) };
}

export type CollectionWithCount = CollectionRow & { productCount: number };

/** All collections with a live product count for the card grid. */
export async function listCollectionsWithCounts(): Promise<CollectionWithCount[]> {
  const rows = await db.query.collections.findMany({ orderBy: [desc(collections.name)] });
  const links = await db.query.productCollections.findMany();
  const countByCollection = new Map<string, number>();
  for (const l of links) {
    countByCollection.set(l.collectionId, (countByCollection.get(l.collectionId) ?? 0) + 1);
  }
  return rows.map((c) => ({ ...c, productCount: countByCollection.get(c.id) ?? 0 }));
}

export type OrderTab = "all" | "unfulfilled" | "fulfilled" | "disputed" | "refunded";

/** Orders list for a status tab (uncached), newest first. */
export async function listOrders(tab: OrderTab = "all", search?: string): Promise<OrderRow[]> {
  const statusFor: Record<Exclude<OrderTab, "all">, OrderRow["status"][]> = {
    unfulfilled: ["paid", "unfulfilled"],
    fulfilled: ["fulfilled"],
    disputed: ["disputed"],
    refunded: ["refunded"],
  };
  const where = tab === "all" ? undefined : inArray(orders.status, statusFor[tab]);
  let rows = await db.query.orders.findMany({ where, orderBy: [desc(orders.placedAt)] });
  const needle = search?.trim().toLowerCase();
  if (needle) {
    rows = rows.filter((o) =>
      [o.code, o.email].join(" ").toLowerCase().includes(needle),
    );
  }
  return rows;
}

/** A person's orders, newest first — for the People profile order-history card. */
export async function listOrdersForPerson(personId: string): Promise<OrderRow[]> {
  return db.query.orders.findMany({
    where: eq(orders.personId, personId),
    orderBy: [desc(orders.placedAt)],
  });
}

/** One order with its line items, any dispute, and the linked CRM person. */
export async function getOrder(id: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return null;
  const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, id) });
  const dispute = await db.query.disputes.findFirst({ where: eq(disputes.orderId, id) });
  const person = order.personId
    ? (await db.query.people.findFirst({ where: eq(people.id, order.personId) })) ?? null
    : null;
  return { order, items, dispute: dispute ?? null, person };
}

/** All shipping zones (uncached). */
export async function listShippingZones(): Promise<ShippingZoneRow[]> {
  return db.query.shippingZones.findMany({ orderBy: [desc(shippingZones.name)] });
}

/** Active, inventory-tracked products at or below their low-stock threshold. */
export async function lowStockProducts(): Promise<ProductRow[]> {
  const rows = await db.query.products.findMany({
    where: and(eq(products.status, "active"), eq(products.trackInventory, true)),
  });
  return rows.filter((p) => p.inventory <= p.lowStockThreshold);
}

/** Whether any product has been created yet — for the setup checklist. */
export async function hasAnyProduct(): Promise<boolean> {
  const row = await db.query.products.findFirst({ columns: { id: true } });
  return !!row;
}

/** Whether any shipping zone has been created yet — for the setup checklist. */
export async function hasAnyShippingZone(): Promise<boolean> {
  const row = await db.query.shippingZones.findFirst({ columns: { id: true } });
  return !!row;
}
