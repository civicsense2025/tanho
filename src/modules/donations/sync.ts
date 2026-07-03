import { payments } from "@/adapters/payments";
import type { DonationsSettings } from "./validation";

/**
 * Create-or-reuse the durable Stripe Product + a customer-adjustable-amount
 * Price for donations, and return the ids to persist. A no-op (returns the
 * existing ids unchanged) when payments are unconfigured, so settings saves
 * never fail just because Stripe isn't connected yet. Prices are immutable,
 * so changing min/max/preset always mints a fresh Price — same rule as
 * commerce/sync.ts's product price sync.
 */
export async function syncDonationsToStripe(
  settings: DonationsSettings,
): Promise<{ stripeProductId: string | null; stripePriceId: string | null }> {
  if (!payments.isConfigured()) {
    return { stripeProductId: settings.stripeProductId, stripePriceId: settings.stripePriceId };
  }
  const { productId, priceId } = await payments.createCustomAmountPrice({
    productId: settings.stripeProductId ?? undefined,
    currency: settings.currency,
    minCents: settings.minCents,
    maxCents: settings.maxCents,
    presetCents: settings.presetCents,
  });
  return { stripeProductId: productId, stripePriceId: priceId };
}
