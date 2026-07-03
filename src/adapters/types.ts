/**
 * Adapter contracts — the stack-swap points for self-hosters (see
 * docs/architecture/adapters.md). Storage lands first; email, payments,
 * sms, ai, and calendar adapter types join this file in later phases.
 * One type per integration surface; implementations live under
 * src/adapters/<surface>/.
 */

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

export type PaymentsAdapter = {
  /** True when real keys are configured (drives the connect/locked UI). */
  isConfigured(): boolean;
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }>;
  /** Verifies the webhook signature and returns the typed event, or throws. */
  constructWebhookEvent(payload: string, signature: string): Promise<ProviderEvent>;
  refund(paymentIntentId: string, amountCents?: number): Promise<void>;
  /** Upsert a durable product + price; returns provider ids. */
  syncProduct(input: {
    name: string;
    description?: string;
    priceCents: number;
    currency: string;
    existingProductId?: string;
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
