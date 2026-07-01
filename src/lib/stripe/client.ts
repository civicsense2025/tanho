import Stripe from "stripe";

/**
 * Lazily-instantiated Stripe client (the site OWNER's account — this is the instance payment
 * layer, not the meta/license layer). Server-only: never import this into a Client Component.
 *
 * We intentionally do NOT pin `apiVersion` — per Stripe's guidance, omitting it uses the version
 * bundled with the installed SDK (stripe@22.x → 2026-06-24.dahlia), which is the right default
 * for a template that owners will keep up to date via `npm update`.
 *
 * Runtime is Node.js (standard Next.js route handlers), so webhook verification uses the sync
 * `constructEvent` (see webhook.ts) — the async SubtleCrypto path is only for edge runtimes.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY must be set when payments are enabled (features.payments). " +
        "It is a server-only secret — never expose it to the client."
    );
  }
  _stripe = new Stripe(key);
  return _stripe;
}

/** The webhook signing secret (whsec_…) for this endpoint. Distinct from the Stripe CLI's
 * `listen` secret used in local dev. */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET must be set to verify Stripe webhooks.");
  return secret;
}
