import { createId } from "@paralleldrive/cuid2";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Products. Prices are integer cents; inventory is the single source of truth. */
export const products = sqliteTable("products", {
  id: text("id").primaryKey().$defaultFn(createId),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  status: text("status", { enum: ["draft", "active"] }).notNull().default("draft"),
  priceCents: integer("price_cents").notNull().default(0),
  compareAtCents: integer("compare_at_cents"),
  currency: text("currency").notNull().default("usd"),
  sku: text("sku").notNull().default(""),
  description: text("description").notNull().default(""),
  images: text("images", { mode: "json" }).$type<string[]>().notNull().default([]),
  trackInventory: integer("track_inventory", { mode: "boolean" }).notNull().default(true),
  inventory: integer("inventory").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  allowBackorder: integer("allow_backorder", { mode: "boolean" }).notNull().default(false),
  weight: text("weight").notNull().default(""),
  weightUnit: text("weight_unit", { enum: ["lb", "kg"] }).notNull().default("lb"),
  dims: text("dims", { mode: "json" }).$type<Record<string, string>>(),
  shippingClass: text("shipping_class", { enum: ["standard", "heavy", "digital"] })
    .notNull()
    .default("standard"),
  seo: text("seo", { mode: "json" }).$type<{ title?: string; description?: string }>(),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

export const productVariants = sqliteTable("product_variants", {
  id: text("id").primaryKey().$defaultFn(createId),
  productId: text("product_id").notNull(),
  label: text("label").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  inventory: integer("inventory").notNull().default(0),
  sku: text("sku").notNull().default(""),
  weight: text("weight").notNull().default(""),
  dims: text("dims").notNull().default(""),
  imageMediaId: text("image_media_id"),
  stripePriceId: text("stripe_price_id"),
});

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey().$defaultFn(createId),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  coverMediaId: text("cover_media_id"),
  visible: integer("visible", { mode: "boolean" }).notNull().default(true),
  seo: text("seo", { mode: "json" }).$type<{ title?: string; description?: string }>(),
});

export const productCollections = sqliteTable(
  "product_collections",
  {
    productId: text("product_id").notNull(),
    collectionId: text("collection_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.collectionId] })],
);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey().$defaultFn(createId),
  code: text("code").notNull().unique(),
  personId: text("person_id"),
  email: text("email").notNull(),
  status: text("status", {
    enum: ["pending", "paid", "unfulfilled", "fulfilled", "refunded", "disputed", "cancelled"],
  })
    .notNull()
    .default("pending"),
  totalCents: integer("total_cents").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  shippingAddress: text("shipping_address", { mode: "json" }).$type<Record<string, string>>(),
  tracking: text("tracking").notNull().default(""),
  placedAt: integer("placed_at").notNull().$defaultFn(() => Date.now()),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey().$defaultFn(createId),
  orderId: text("order_id").notNull(),
  productId: text("product_id"),
  variantId: text("variant_id"),
  name: text("name").notNull(),
  qty: integer("qty").notNull().default(1),
  unitCents: integer("unit_cents").notNull().default(0),
});

export const disputes = sqliteTable("disputes", {
  id: text("id").primaryKey().$defaultFn(createId),
  orderId: text("order_id").notNull(),
  stripeDisputeId: text("stripe_dispute_id").notNull().unique(),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("needs_response"),
  amountCents: integer("amount_cents").notNull().default(0),
  evidenceDueAt: integer("evidence_due_at"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const shippingZones = sqliteTable("shipping_zones", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  method: text("method", { enum: ["flat", "weight"] }).notNull().default("flat"),
  rateCents: integer("rate_cents").notNull().default(0),
  perLbCents: integer("per_lb_cents").notNull().default(0),
  freeOverCents: integer("free_over_cents"),
  countries: text("countries", { mode: "json" }).$type<string[]>().notNull().default([]),
});

/** Webhook idempotency ledger — a duplicate event id is acked and skipped. */
export const stripeEvents = sqliteTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: integer("received_at").notNull().$defaultFn(() => Date.now()),
  processedAt: integer("processed_at"),
  payload: text("payload", { mode: "json" }).$type<unknown>(),
});
