import "server-only";
import {
  getCredentials,
  updateCredentials,
  type IntegrationProvider,
  type OAuthCredentials,
} from "@/modules/integrations";
import { googleClientId, googleClientSecret, googleRedirectUri, scopesFor } from "./config";

/**
 * Pure OAuth 2.0 helpers for Google, via direct fetch (no googleapis dep).
 * SERVER-ONLY: handles client secrets and refresh tokens.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/** Build the Google consent-screen URL for a given provider + signed state. */
export function buildAuthUrl(provider: IntegrationProvider, state: string): string {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: scopesFor(provider).join(" "),
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  refresh_token?: string;
};

export type ExchangedTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scope: string;
};

/** Exchange an authorization code for tokens (initial connect). */
export async function exchangeCode(code: string): Promise<ExchangedTokens> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

export type RefreshedTokens = { accessToken: string; expiresIn: number; scope: string };

/** Exchange a refresh token for a fresh access token. */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshedTokens> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as TokenResponse;
  return { accessToken: data.access_token, expiresIn: data.expires_in, scope: data.scope };
}

/** Small safety margin so a token doesn't expire mid-request. */
const EXPIRY_SKEW_MS = 60_000;

/**
 * Returns a valid access token for `provider`, refreshing (and persisting the
 * refreshed credentials) when the cached one is expired or missing. Returns
 * null when the provider isn't connected or the stored credentials are not
 * an OAuth blob (defensive — should never happen for a Google provider).
 */
export async function getAccessToken(provider: IntegrationProvider): Promise<string | null> {
  const creds = await getCredentials(provider);
  if (!creds || creds.kind !== "oauth") return null;

  const now = Date.now();
  if (creds.accessToken && creds.accessTokenExpiresAt && creds.accessTokenExpiresAt - EXPIRY_SKEW_MS > now) {
    return creds.accessToken;
  }

  const refreshed = await refreshAccessToken(creds.refreshToken);
  const next: OAuthCredentials = {
    kind: "oauth",
    refreshToken: creds.refreshToken,
    accessToken: refreshed.accessToken,
    accessTokenExpiresAt: now + refreshed.expiresIn * 1000,
    scope: refreshed.scope || creds.scope,
  };
  await updateCredentials(provider, next, next.accessTokenExpiresAt ?? null);
  return refreshed.accessToken;
}
