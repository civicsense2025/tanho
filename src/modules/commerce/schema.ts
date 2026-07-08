import { createId } from "@paralleldrive/cuid2";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Canonical product kinds — the "what is it" axis. Orthogonal to billingModel. */
export type ProductKind = "physical" | "digital" | "service" | "course";
export const PRODUCT_KINDS: readonly ProductKind[] = ["physical", "digital", "service", "course"];

/** Billing axis — "how do they pay". recurring products reference a memberships tier. */
export type BillingModel = "one-time" | "recurring";

/** Fulfillment mode — how the buyer receives the thing. Defaults derived from kind. */
export type FulfillmentMode = "ship" | "download" | "access_grant" | "booking" | "pod" | "none";

/**
 * Products. Prices are integer cents; inventory is the single source of truth.
 *
 * Two orthogonal axes describe a product:
 *  - `kind` (physical|digital|service|course) — what the buyer receives.
 *  - `billingModel` (one-time|recurring) — how they pay. When recurring, the
 *    product references a memberships tier; the memberships table owns the
 *    Stripe Subscription lifecycle (see modules/memberships/events.ts).
 *
 * `packType`/`packEntryId` are DEPRECATED — superseded by
 * `kind="digital"` + `accessGrantTargetType="pack"` + `accessGrantTargetId`.
 * Kept for one release so the migration script can backfill; dropped in 0036.
 */
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
  /** Pack-product link. When non-null, this product sells a block_pack or
   *  design_pack entry; purchase grants a download/install entitlement. */
  packType: text("pack_type", { enum: ["block_pack", "design_pack"] }),
  packEntryId: text("pack_entry_id"),
  // --- New typed-product axes (migration 0034) ---
  /** What the buyer receives. Drives tax code defaults + fulfillment mode. */
  kind: text("kind", { enum: ["physical", "digital", "service", "course"] })
    .notNull()
    .default("physical"),
  /** How they pay. recurring products must reference a memberships tier. */
  billingModel: text("billing_model", { enum: ["one-time", "recurring"] })
    .notNull()
    .default("one-time"),
  /** Required when billingModel=recurring; links to memberships.tier. */
  membershipTier: text("membership_tier"),
  /** Stripe tax code (e.g. txcd_99999999). Auto-assigned from kind on create. */
  taxCode: text("tax_code"),
  /** Whether the price already includes tax (inclusive) or tax is added at checkout (exclusive). */
  taxBehavior: text("tax_behavior", { enum: ["exclusive", "inclusive"] }).notNull().default("exclusive"),
  /** How the buyer receives the product. Default derived from kind. */
  fulfillmentMode: text("fulfillment_mode", { enum: ["ship", "download", "access_grant", "booking", "pod", "none"] })
    .notNull()
    .default("ship"),
  /** What purchasing this product grants access to. */
  accessGrantTargetType: text("access_grant_target_type", { enum: ["entry", "membership", "pack", "download"] }),
  /** The id/slug/ref of the granted target (entry id, tier slug, "packType:entryId", download url). */
  accessGrantTargetId: text("access_grant_target_id"),
  /** Who fulfills physical orders. "local" = self-fulfill; others route to POD providers (v2). */
  fulfillmentProvider: text("fulfillment_provider", { enum: ["local", "printful", "printify", "manual"] })
    .notNull()
    .default("local"),
  /** Provider-specific config (POD product id, parcel template, etc.). */
  fulfillmentConfig: text("fulfillment_config", { mode: "json" }).$type<Record<string, unknown>>(),
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
  // --- Variant-level overrides (migration 0034) ---
  // Nullable = inherit from parent product. Set when a single product mixes
  // physical + digital variants (Shopify's variant-level requires_shipping pattern).
  kind: text("kind", { enum: ["physical", "digital", "service", "course"] }),
  taxCode: text("tax_code"),
  /** null = derive from kind; explicit false marks a digital variant of a physical product. */
  requiresShipping: integer("requires_shipping", { mode: "boolean" }),
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
  refundedCents: integer("refunded_cents").notNull().default(0),
  // --- Tax persistence (migration 0034) ---
  /** Total tax charged (Stripe Tax breakdown captured on checkout.session.completed). */
  taxCents: integer("tax_cents").notNull().default(0),
  /** Tax reversed on refunds (tracked separately so reports stay correct). */
  taxRefundedCents: integer("tax_refunded_cents").notNull().default(0),
  /** Per-jurisdiction breakdown from Stripe ({ jurisdiction, amount, taxRateId? }). */
  taxBreakdown: text("tax_breakdown", { mode: "json" })
    .$type<Array<{ jurisdiction: string; amount: number; taxRateId?: string }>>()
    .notNull()
    .default([]),
  source: text("source", { enum: ["shop", "donation"] }).notNull().default("shop"),
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
  // --- Per-line tax (migration 0034) ---
  taxCents: integer("tax_cents").notNull().default(0),
  taxCode: text("tax_code"),
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

/**
 * Pack entitlements — granted automatically when an order containing a
 * pack product is paid. Entitles the buyer (a `people` row) to download or
 * install the linked block_pack / design_pack entry.
 *
 * DEPRECATED — superseded by the general `entitlements` table below. Kept for
 * one release so the migration script can backfill; dropped in 0036.
 */
export const packEntitlements = sqliteTable(
  "pack_entitlements",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    personId: text("person_id").notNull(),
    packType: text("pack_type", { enum: ["block_pack", "design_pack"] }).notNull(),
    packEntryId: text("pack_entry_id").notNull(),
    orderId: text("order_id").notNull(),
    grantedAt: integer("granted_at").notNull().$defaultFn(() => Date.now()),
  },
  (t) => [uniqueIndex("pack_entitlements_person_pack_order_idx").on(t.personId, t.packType, t.packEntryId, t.orderId)],
);

/**
 * General-purpose entitlements — granted when an order containing a product
 * with `accessGrantTargetType` is paid. Replaces packEntitlements: a pack
 * grant is `grantType="pack"`, `grantRef="${packType}:${packEntryId}"`.
 *
 * Note: no orderId in a unique constraint — a person can hold the same grant
 * from multiple orders (e.g. gift purchases). Idempotency at insert time is
 * handled by the grant function's onConflictDoNothing on
 * (personId, grantType, grantRef, orderId).
 */
export const entitlements = sqliteTable(
  "entitlements",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    personId: text("person_id").notNull(),
    orderId: text("order_id").notNull(),
    productId: text("product_id").notNull(),
    /** What was granted. */
    grantType: text("grant_type", {
      enum: ["pack", "entry", "membership", "download", "course", "service_booking"],
    }).notNull(),
    /** Stable reference to the granted thing (entry id, tier slug, "packType:entryId", etc.). */
    grantRef: text("grant_ref").notNull(),
    grantedAt: integer("granted_at").notNull().$defaultFn(() => Date.now()),
    /** For subscriptions/memberships: when the grant expires (null = perpetual). */
    expiresAt: integer("expires_at"),
    /** Set when a grant is revoked (cancellation, refund, etc.). */
    revokedAt: integer("revoked_at"),
  },
  (t) => [
    index("entitlements_person_idx").on(t.personId),
    index("entitlements_grant_idx").on(t.grantType, t.grantRef),
    uniqueIndex("entitlements_person_order_grant_idx").on(t.personId, t.orderId, t.grantType, t.grantRef),
  ],
);
