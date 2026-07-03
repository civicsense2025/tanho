import { makeSignedToken, verifySignedToken } from "@/modules/people/tokens";

/**
 * Signed, expiring `state` param for the Supabase OAuth round-trip — CSRF
 * protection plus a tamper-proof carrier for which action started the flow
 * ("create" a new project vs. "connect" an existing one) and the PKCE
 * `code_verifier`. Reuses the HMAC signing primitive from
 * modules/people/tokens.ts (keyed off APP_ENCRYPTION_KEY); the distinct
 * `purpose` string keeps this signature namespace separate from Google's
 * OAuth state and from email links.
 *
 * Unlike Google's state (a bare provider string), Supabase's flow has no
 * server session to stash a PKCE `code_verifier` in between the redirect out
 * and the callback, so the signed payload is JSON-encoded — same opaque
 * string primitive, richer payload.
 */
const PURPOSE = "supabase-oauth-state";
const TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty for a consent redirect.

export type SupabaseOAuthIntent = "create" | "connect";

export type SupabaseOAuthStatePayload = {
  intent: SupabaseOAuthIntent;
  codeVerifier: string;
};

/** Mint a signed state carrying the intent + PKCE code verifier. */
export function makeOAuthState(payload: SupabaseOAuthStatePayload): string {
  return makeSignedToken(PURPOSE, JSON.stringify(payload), TTL_MS);
}

/** Verify a state param; returns the parsed payload, or null if invalid/expired/malformed. */
export function verifyOAuthState(state: string): SupabaseOAuthStatePayload | null {
  const raw = verifySignedToken(PURPOSE, state);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "intent" in parsed &&
      "codeVerifier" in parsed &&
      (parsed.intent === "create" || parsed.intent === "connect") &&
      typeof (parsed as { codeVerifier: unknown }).codeVerifier === "string"
    ) {
      return parsed as SupabaseOAuthStatePayload;
    }
    return null;
  } catch {
    return null;
  }
}
