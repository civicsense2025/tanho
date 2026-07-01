import { z } from "zod";

/**
 * Zod schemas for untrusted public payloads. Any field that reaches a DB filter (esp. Mongo)
 * MUST be narrowed here — an email is `.email()`, a token is `.uuid()` — so an object like
 * `{ $ne: null }` can never survive parsing into a query.
 */

/** Public newsletter subscribe. */
export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

/** Confirm / unsubscribe by token — tokens are UUIDs, so anything else is rejected before it
 * reaches getSubscriberByToken. */
export const tokenSchema = z.object({
  token: z.string().uuid(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type TokenInput = z.infer<typeof tokenSchema>;
