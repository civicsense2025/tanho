/**
 * Adapter contracts — the stack-swap points for self-hosters (see
 * docs/architecture/adapters.md). Storage lands first; email, payments,
 * sms, ai, and calendar adapter types join this file in later phases.
 * One type per integration surface; implementations live under
 * src/adapters/<surface>/.
 */
import type { Gate } from "@/modules/entitlements/gate";

export type StorageAdapter = {
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
  read(key: string): Promise<{ data: Uint8Array; contentType: string } | null>;
};

/**
 * Transactional/marketing email delivery. The console impl (default) logs
 * messages for local development; an SMTP driver lands later. Verification,
 * double-opt-in confirmations, and welcome mail all go through this surface.
 */
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailAdapter = {
  send(message: EmailMessage): Promise<void>;
};

/**
 * Payments. Stripe is the reference impl; a `null` impl keeps commerce and
 * membership modules importable (and the admin showing a "connect" state)
 * with no keys configured. Amounts are always integer minor units (cents);
 * prices come from the DB/provider, never the client.
 */
export type CheckoutLineItem = {
  /** Provider price id (synced) OR an ad-hoc amount. */
  priceId?: string;
  amountCents?: number;
  currency?: string;
  name?: string;
  quantity: number;
};

export type CheckoutSessionInput = {
  mode: "payment" | "subscription";
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  stripeCustomerId?: string;
  /** Opaque reference stored on the order so the webhook can reconcile. */
  clientReferenceId?: string;
  metadata?: Record<string, string>;
  shippingRates?: Array<{ label: string; amountCents: number }>;
  automaticTax?: boolean;
};

export type RefundReason = "duplicate" | "fraudulent" | "requested_by_customer";

export type PaymentsAdapter = {
  /** True when real keys are configured (drives the connect/locked UI). */
  isConfigured(): boolean;
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }>;
  /** Verifies the webhook signature and returns the typed event, or throws. */
  constructWebhookEvent(payload: string, signature: string): Promise<ProviderEvent>;
  refund(paymentIntentId: string, amountCents?: number, reason?: RefundReason): Promise<void>;
  /** Upsert a durable product + price; returns provider ids. */
  syncProduct(input: {
    name: string;
    description?: string;
    priceCents: number;
    currency: string;
    existingProductId?: string;
  }): Promise<{ productId: string; priceId: string }>;
  /**
   * Create-or-reuse a durable Product + a customer-adjustable-amount Price
   * (Stripe's "pay what you want" pattern) — used for donations. The Price
   * is created once and its id reused across every checkout; re-syncing
   * (e.g. new min/max/preset) always mints a fresh Price, since Prices are
   * immutable, same as syncProduct.
   */
  createCustomAmountPrice(input: {
    productId?: string;
    currency: string;
    minCents?: number;
    maxCents?: number;
    presetCents?: number;
  }): Promise<{ productId: string; priceId: string }>;
  billingPortalUrl(stripeCustomerId: string, returnUrl: string): Promise<string>;
};

/** A provider webhook event, narrowed to what our state machine consumes. */
export type ProviderEvent = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  raw: unknown;
};

/**
 * Read-only analytics source. The `internal` impl reads the first-party
 * analytics_events table; a `ga4` impl (later) reads Google Analytics 4 /
 * Search Console behind OAuth. `isConfigured()` drives the admin connect gate.
 * Amounts are plain counts; the shapes mirror modules/analytics/queries.ts.
 */
export type AnalyticsOverviewData = {
  visitors: number;
  pageviews: number;
  events: number;
  pages: number;
  windowDays: number;
  /** Same metrics for the immediately preceding window of equal length —
   *  powers the KPI trend (↑/↓ + delta%) indicators. */
  prior: {
    visitors: number;
    pageviews: number;
    events: number;
    pages: number;
  };
};

export type AnalyticsPageStat = { path: string; views: number; uniques: number };
export type AnalyticsQueryStat = { query: string; clicks: number; ctr: number };

export type AnalyticsReadAdapter = {
  /** True when this source can serve real data (gates the connect UI). */
  isConfigured(): boolean | Promise<boolean>;
  overview(days?: number): Promise<AnalyticsOverviewData>;
  topPages(days?: number, limit?: number): Promise<AnalyticsPageStat[]>;
  topQueries(days?: number, limit?: number): Promise<AnalyticsQueryStat[]>;
};

/**
 * External data sources — lets bound blocks read live rows from a
 * self-hoster's OWN database (Postgres, Supabase, later Turso/MongoDB)
 * without the platform hardcoding any vendor. See
 * docs/architecture/adapters.md and src/modules/data-sources/.
 *
 * The entire injection defense lives in `QuerySpec`'s shape: it is a
 * strictly-typed, allowlisted query descriptor — never a raw SQL/query
 * string. Every implementation must translate `QuerySpec` into a
 * parameterized call on its native driver (never string concatenation).
 * Only single-table/collection flat filtering is supported; there is no
 * escape hatch for joins or raw passthrough, by design.
 */
export type ColumnDesc = {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "json";
};

export type TableDesc = { name: string; columns: ColumnDesc[] };

export type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";

export type DataSourceFilter = {
  column: string;
  op: FilterOp;
  value: string | number | boolean | (string | number)[];
};

export type QuerySpec = {
  /** Must be present in the connection's stored allowlist. */
  table: string;
  /** Must be a subset of the allowlisted columns for `table`. */
  columns: string[];
  filters?: DataSourceFilter[];
  sort?: { column: string; dir: "asc" | "desc" }[];
  /** Requested cap; every adapter clamps this to its own hard max regardless. */
  limit: number;
};

export type DataSourceQueryResult = {
  rows: Record<string, unknown>[];
  /** True when the result was cut off by the server-enforced row cap. */
  truncated: boolean;
};

export type DataSourceAdapter = {
  isConfigured(): boolean;
  /**
   * Forward-compat only: `write` is always false/unused in phase 1 — there
   * is no `mutate()` yet, so this describes the adapter's eventual shape,
   * not current behavior. No write path exists from blocks to external
   * databases today, regardless of what this reports.
   */
  capabilities(): { read: boolean; write: boolean };
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  /** Introspection for the admin allowlist editor only — never called at render time. */
  listTables(): Promise<TableDesc[]>;
  query(spec: QuerySpec): Promise<DataSourceQueryResult>;
};

/**
 * Full-text search over first-party content (pages, entries, products) — the
 * PRIMARY database's own search capability, not an external data source. Two
 * real implementations exist because the primary DB itself is an adapter (see
 * docs/architecture/adapters.md "Primary database is an adapter too"):
 * `fts5` for SQLite/libSQL (the default dialect, plus Turso), `postgres` for
 * Postgres/Supabase (the `scripts/swap-db-dialect.ts` target). The factory in
 * src/adapters/search/index.ts infers which one to construct from
 * `DATABASE_URL`'s scheme — same "read an existing signal" precedent
 * src/adapters/payments/index.ts already uses for STRIPE_SECRET_KEY, so
 * swapping the primary DB to Postgres needs no separate search config.
 *
 * A `SearchDocument`'s `gate` is a snapshot resolved at index time (the same
 * "precompute at publish, cheap-read at request" pattern as
 * pages.hasPaywall/treeHasPaywall — see docs/architecture/paywall.md) — it is
 * NOT trusted as the final word. Query-time code MUST re-resolve each hit's
 * stored gate against the real viewer (resolveEntitlement in
 * src/modules/entitlements/gate.ts) before returning it, exactly like a page
 * render re-checks viewerPassesPaywall rather than trusting a cached flag.
 * Never skip the re-check to save a query — a stale or forged index row must
 * never leak gated content.
 */
export type SearchDocumentType = "page" | "entry" | "product" | "content";

export type SearchDocument = {
  /** Stable identity: `${type}:${id}` — lets re-indexing upsert instead of duplicate. */
  id: string;
  type: SearchDocumentType;
  /** Foreign key into the owning table (pages.id / entries.id / products.id). */
  sourceId: string;
  title: string;
  /** Plain text extracted from the block tree (see indexBlockTree) or entity fields — never raw HTML/markdown. */
  body: string;
  path: string;
  /** Resolved at index time; re-checked against the real viewer at query time, never trusted alone. */
  gate: Gate | null;
  updatedAt: number;
};

export type SearchHit = {
  document: SearchDocument;
  /** Higher is more relevant; not comparable across dialects (FTS5 bm25 vs. ts_rank_cd use different scales). */
  score: number;
  /** Plain-text fragment with the match in context, for the results list. */
  snippet: string;
};

export type SearchAdapter = {
  /** True once the backing schema (FTS5 virtual table / tsvector column) exists — checked once at startup, not per-request. */
  isConfigured(): Promise<boolean>;
  /** Insert-or-replace by `document.id`. Indexing hooks call this per changed row, not a full reindex. */
  index(document: SearchDocument): Promise<void>;
  /** Remove by id — called when a page/entry/product is deleted or unpublished. */
  remove(id: string): Promise<void>;
  /**
   * Raw search, gate UNCHECKED — callers MUST re-resolve `hit.document.gate`
   * against the real viewer before returning any hit to a client. `limit` is
   * a request; every implementation clamps to its own hard max regardless.
   */
  search(query: string, opts?: { types?: SearchDocumentType[]; limit?: number }): Promise<SearchHit[]>;
};
