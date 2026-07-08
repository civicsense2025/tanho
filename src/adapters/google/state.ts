import { makeSignedToken, verifySignedToken } from "@/modules/people/tokens";
import { isGoogleProvider, type GoogleProvider } from "./config";

/**
 * Signed, expiring `state` param for the Google OAuth round-trip — CSRF
 * protection plus a tamper-proof carrier for which Google surface (provider)
 * initiated the flow AND where it started (browser vs native app). Reuses the
 * HMAC signing primitive from modules/people/tokens.ts (keyed off
 * APP_ENCRYPTION_KEY); the distinct `purpose` string keeps this signature
 * namespace separate from email links.
 *
 * The single registered Google redirect URI is always the web callback, so a
 * native-app-initiated flow still lands there — the callback reads `origin`
 * from the verified state to decide whether to redirect the browser to an
 * admin page (web) or to the app's `lamina://` scheme (app). Encoding origin in
 * the SIGNED state (not a query param) keeps it tamper-proof.
 */
const PURPOSE = "google-oauth-state";
const TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty for a consent redirect.

/** Where the OAuth flow was initiated — determines the post-consent redirect. */
export type OAuthOrigin = "web" | "app";

export type VerifiedOAuthState = { provider: GoogleProvider; origin: OAuthOrigin };

/**
 * Mint a signed state carrying the target provider and origin. The payload is
 * `provider` for a web flow (unchanged, backward-compatible) or
 * `provider|app` for a native-app flow.
 */
export function makeOAuthState(provider: string, origin: OAuthOrigin = "web"): string {
  const payload = origin === "app" ? `${provider}|app` : provider;
  return makeSignedToken(PURPOSE, payload, TTL_MS);
}

/**
 * Verify a state param; returns the provider + origin, or null if
 * invalid/expired/unknown. A payload with no `|origin` suffix is treated as a
 * web flow, so states minted before origin encoding still verify.
 */
export function verifyOAuthState(state: string): VerifiedOAuthState | null {
  const payload = verifySignedToken(PURPOSE, state);
  if (!payload) return null;
  const [provider, originRaw] = payload.split("|");
  if (!provider || !isGoogleProvider(provider)) return null;
  const origin: OAuthOrigin = originRaw === "app" ? "app" : "web";
  return { provider, origin };
}
