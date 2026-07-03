import { makeSignedToken, verifySignedToken } from "@/modules/people/tokens";
import { isGoogleProvider, type GoogleProvider } from "./config";

/**
 * Signed, expiring `state` param for the Google OAuth round-trip — CSRF
 * protection plus a tamper-proof carrier for which Google surface (provider)
 * initiated the flow. Reuses the HMAC signing primitive from
 * modules/people/tokens.ts (keyed off APP_ENCRYPTION_KEY); the distinct
 * `purpose` string keeps this signature namespace separate from email links.
 */
const PURPOSE = "google-oauth-state";
const TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty for a consent redirect.

/** Mint a signed state carrying the target provider. */
export function makeOAuthState(provider: string): string {
  return makeSignedToken(PURPOSE, provider, TTL_MS);
}

/** Verify a state param; returns the provider, or null if invalid/expired/unknown. */
export function verifyOAuthState(state: string): GoogleProvider | null {
  const provider = verifySignedToken(PURPOSE, state);
  if (!provider || !isGoogleProvider(provider)) return null;
  return provider;
}
