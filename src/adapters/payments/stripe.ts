import Stripe from "stripe";
import type { CheckoutSessionInput, PaymentsAdapter, ProviderEvent, RefundReason } from "../types";

const key = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Lazily constructed so importing this module never throws without keys.
let client: Stripe | null = null;
function stripe(): Stripe {
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  return client;
}

export const stripePayments: PaymentsAdapter = {
  isConfigured: () => !!key,

  async createCheckoutSession(input: CheckoutSessionInput) {
    const s = await stripe().checkout.sessions.create({
      mode: input.mode,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer: input.stripeCustomerId,
      customer_email: input.stripeCustomerId ? undefined : input.customerEmail,
      client_reference_id: input.clientReferenceId,
      metadata: input.metadata,
      automatic_tax: input.automaticTax ? { enabled: true } : undefined,
      line_items: input.lineItems.map((li) =>
        li.priceId
          ? { price: li.priceId, quantity: li.quantity }
          : {
            quantity: li.quantity,
            price_data: {
              currency: li.currency ?? "usd",
              unit_amount: li.amountCents ?? 0,
              product_data: {
                name: li.name ?? "Item",
                // Stripe Tax: per-line tax code + behavior. When omitted,
                // Stripe falls back to the account default tax code.
                ...(li.taxCode ? { tax_code: li.taxCode } : {}),
              },
              // tax_behavior is a price_data field (not product_data).
              ...(li.taxBehavior ? { tax_behavior: li.taxBehavior } : {}),
            },
          },
      ),
      shipping_options: input.shippingRates?.map((r) => ({
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: r.label,
          fixed_amount: { amount: r.amountCents, currency: "usd" },
        },
      })),
    });
    return { id: s.id, url: s.url ?? "" };
  },

  async constructWebhookEvent(payload: string, signature: string): Promise<ProviderEvent> {
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    const event = await stripe().webhooks.constructEventAsync(payload, signature, webhookSecret);
    return {
      id: event.id,
      type: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
      raw: event,
    };
  },

  async refund(paymentIntentId: string, amountCents?: number, reason?: RefundReason) {
    await stripe().refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
      reason,
    });
  },

  async syncProduct(input) {
    const product = input.existingProductId
      ? await stripe().products.update(input.existingProductId, {
        name: input.name,
        description: input.description || undefined,
      })
      : await stripe().products.create({
        name: input.name,
        description: input.description || undefined,
      });
    // Prices are immutable; always create a fresh one and let the DB point at it.
    const price = await stripe().prices.create({
      product: product.id,
      currency: input.currency,
      unit_amount: input.priceCents,
    });
    return { productId: product.id, priceId: price.id };
  },

  async createCustomAmountPrice(input) {
    const productId = input.productId
      ? input.productId
      : (await stripe().products.create({ name: "Donation" })).id;
    const price = await stripe().prices.create({
      product: productId,
      currency: input.currency,
      custom_unit_amount: {
        enabled: true,
        minimum: input.minCents,
        maximum: input.maxCents,
        preset: input.presetCents,
      },
    });
    return { productId, priceId: price.id };
  },

  async billingPortalUrl(stripeCustomerId: string, returnUrl: string) {
    const session = await stripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
    return session.url;
  },
};
