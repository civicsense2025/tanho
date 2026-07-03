import type { PaymentsAdapter } from "../types";

/**
 * The unconfigured payments adapter. Keeps commerce/membership code
 * importable with no Stripe keys; the admin shows a "connect" state and
 * checkout is refused. Every method that would touch Stripe throws a clear
 * "not configured" error so a miswired call fails loudly, not silently.
 */
const notConfigured = (): never => {
  throw new Error("Payments are not configured. Add Stripe keys to enable checkout.");
};

export const nullPayments: PaymentsAdapter = {
  isConfigured: () => false,
  createCheckoutSession: async () => notConfigured(),
  constructWebhookEvent: async () => notConfigured(),
  refund: async () => notConfigured(),
  syncProduct: async () => notConfigured(),
  billingPortalUrl: async () => notConfigured(),
};
