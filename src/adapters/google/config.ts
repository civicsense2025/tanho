import type { IntegrationProvider } from "@/modules/integrations";
import { GOOGLE_PROVIDERS } from "@/modules/integrations";

export type GoogleProvider = (typeof GOOGLE_PROVIDERS)[number];

/**
 * BYO Google OAuth config. Every white-label deployment registers its OWN
 * Google Cloud OAuth app (Calendar + Analytics + Search Console APIs enabled)
 * and sets these two env vars — the platform vendor's Google account is never
 * involved. With no env vars set, `isGoogleOAuthConfigured()` is false and
 * every Google surface degrades to its current stub/fallback behavior.
 */

export function googleClientId(): string {
  return process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
}

export function googleClientSecret(): string {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
}

/** True only when both the client id and secret are set. */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(googleClientId() && googleClientSecret());
}

/** APP_URL gives the redirect origin; falls back to localhost for dev. */
function appOrigin(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** The single redirect URI registered on the Google OAuth app. */
export function googleRedirectUri(): string {
  return `${appOrigin()}/api/oauth/google/callback`;
}

/** Per-surface scope lists. Each Google provider requests only what it needs. */
const SCOPES: Record<GoogleProvider, string[]> = {
  "google-calendar": [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
  "google-analytics": ["https://www.googleapis.com/auth/analytics.readonly"],
  "google-search-console": ["https://www.googleapis.com/auth/webmasters.readonly"],
};

/** OAuth scopes to request for a given Google integration surface. */
export function scopesFor(provider: IntegrationProvider): string[] {
  return (SCOPES as Partial<Record<IntegrationProvider, string[]>>)[provider] ?? [];
}

/** Type guard: is this provider one of the three Google OAuth surfaces? */
export function isGoogleProvider(provider: string): provider is GoogleProvider {
  return (GOOGLE_PROVIDERS as readonly string[]).includes(provider);
}
