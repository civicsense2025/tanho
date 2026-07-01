import { SignJWT, jwtVerify } from "jose";
import { getActiveSubscriptionByEmail } from "@/lib/db";

/**
 * Reader entitlement for paid posts. Paid content is SUBSCRIPTION-ONLY (no one-time paid-post
 * purchases), so entitlement reduces to a single question: does this reader have an active
 * subscription? There are no reader accounts, so a reader proves their email once (after
 * subscribing) and we mint a short-lived subscriber token; access is then re-checked against the
 * live subscription on every request, so a cancellation revokes access even before the token
 * expires.
 *
 * Subscription MANAGEMENT (cancel, update card, invoices) and all payment emails (receipts,
 * renewal/failure notices, portal login link) are handled entirely by Stripe's hosted customer
 * portal + Stripe's customer emails — the owner enables those in the Stripe Dashboard, so the
 * template owns no billing-email delivery or portal auth.
 *
 * SECURITY: the subscriber token uses a DISTINCT jose audience ("reader") from the admin cookie,
 * so a leaked reader token can never be mistaken for an admin session. It's signed with a
 * dedicated ENTITLEMENT_SECRET (falling back to ADMIN_SECRET only so single-secret setups work —
 * the audience separation, not the key, is what prevents confusion).
 */

const READER_AUDIENCE = "reader";
const ACCESS_COOKIE = "post_access";

function secret(): Uint8Array {
  const s = process.env.ENTITLEMENT_SECRET || process.env.ADMIN_SECRET || "change-me-in-production-please";
  return new TextEncoder().encode(s);
}

/** Issues a short-lived subscriber token proving an email owns an (at-issue-time) active
 * subscription. Access is still re-verified live on each use. */
export async function signSubscriberToken(email: string, ttl = "7d"): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(READER_AUDIENCE)
    .setExpirationTime(ttl)
    .sign(secret());
}

/** Verifies a subscriber token and returns its email, or null if invalid/expired/wrong audience. */
export async function verifySubscriberToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: READER_AUDIENCE });
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

/**
 * Server-side entitlement decision for a paid (subscriber-only) post. Returns true only if the
 * token is a valid subscriber token AND that email still has an active subscription right now —
 * so a canceled subscriber loses access immediately, regardless of token TTL. Callers must
 * default paid content to hidden.
 */
export async function verifyPostAccess(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const email = await verifySubscriberToken(token);
  if (!email) return false;
  const sub = await getActiveSubscriptionByEmail(email);
  return Boolean(sub);
}

export const ACCESS_COOKIE_NAME = ACCESS_COOKIE;
export const READER_TOKEN_AUDIENCE = READER_AUDIENCE;
