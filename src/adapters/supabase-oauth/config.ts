/**
 * BYO Supabase OAuth config. Every white-label deployment registers its OWN
 * Supabase OAuth app (console.supabase.com → OAuth Apps) and sets these two
 * env vars — the platform vendor's Supabase account is never involved. With
 * no env vars set, `isSupabaseOAuthConfigured()` is false and the Supabase
 * connect entry point stays hidden (see google/config.ts for the identical
 * pattern this mirrors).
 */

export function supabaseOAuthClientId(): string {
  return process.env.SUPABASE_OAUTH_CLIENT_ID ?? "";
}

export function supabaseOAuthClientSecret(): string {
  return process.env.SUPABASE_OAUTH_CLIENT_SECRET ?? "";
}

/** True only when both the client id and secret are set. */
export function isSupabaseOAuthConfigured(): boolean {
  return Boolean(supabaseOAuthClientId() && supabaseOAuthClientSecret());
}

/** APP_URL gives the redirect origin; falls back to localhost for dev. */
function appOrigin(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** The single redirect URI registered on the Supabase OAuth app. */
export function supabaseOAuthRedirectUri(): string {
  return `${appOrigin()}/api/oauth/supabase/callback`;
}
