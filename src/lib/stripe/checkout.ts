import type Stripe from "stripe";
import { getStripe } from "./client";
import { siteConfig } from "@/config/site.config";

/**
 * Builds Stripe Checkout Sessions for the three sell modes. Per Stripe's security guidance the
 * SERVER always sets the price — the client never dictates an amount:
 *  - one-time / subscription: a server-known Price ID (validated by the caller against the DB).
 *  - donation: `custom_unit_amount` with server-set min/max bounds, so even a customer-chosen
 *    amount is enforced by Stripe within our range (never a raw client unit_amount).
 *
 * The caller redirects to the returned `session.url` (303) — the current recommended flow;
 * `redirectToCheckout` is the legacy path. Returns the Session so the caller can persist a
 * pending Order keyed by session.id.
 */

const successUrl = () => `${siteConfig.url}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
const cancelUrl = () => `${siteConfig.url}/checkout/cancel`;

export interface OneTimeParams {
  priceId: string;
  email?: string;
  /** Attached to metadata + used for paid-post entitlement. */
  postId?: string;
}

export async function createOneTimeCheckout(params: OneTimeParams): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: successUrl(),
    cancel_url: cancelUrl(),
    customer_email: params.email,
    metadata: { kind: "one_time", ...(params.postId ? { postId: params.postId } : {}) },
  });
}

export interface SubscriptionParams {
  priceId: string;
  email?: string;
}

export async function createSubscriptionCheckout(params: SubscriptionParams): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: successUrl(),
    cancel_url: cancelUrl(),
    customer_email: params.email,
    metadata: { kind: "subscription" },
  });
}

export interface DonationParams {
  /** Smallest currency unit (e.g. cents). Server-enforced bounds. */
  minAmount?: number;
  maxAmount?: number;
  presetAmount?: number;
  currency?: string;
  email?: string;
}

export async function createDonationCheckout(params: DonationParams): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const currency = params.currency || "usd";
  // `custom_unit_amount` is a documented Checkout price_data field (pay-what-you-want) that this
  // SDK version's TypeScript types don't yet expose. The Stripe API accepts it, and using it is
  // the recommended, injection-safe donation path — the customer picks the amount but Stripe
  // enforces our server-set minimum/maximum, so no client-supplied unit_amount is ever trusted.
  const priceData = {
    currency,
    product_data: { name: `Support ${siteConfig.siteName}` },
    custom_unit_amount: {
      enabled: true,
      minimum: params.minAmount ?? 100,
      maximum: params.maxAmount ?? 1_000_000,
      ...(params.presetAmount ? { preset: params.presetAmount } : {}),
    },
  } as unknown as Stripe.Checkout.SessionCreateParams.LineItem.PriceData;

  return stripe.checkout.sessions.create({
    mode: "payment",
    submit_type: "donate",
    line_items: [{ price_data: priceData, quantity: 1 }],
    success_url: successUrl(),
    cancel_url: cancelUrl(),
    customer_email: params.email,
    metadata: { kind: "donation" },
  });
}
