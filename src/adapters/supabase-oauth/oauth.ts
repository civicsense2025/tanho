import "server-only";
import { createHash, randomBytes } from "node:crypto";
import {
  getOAuthCredentials,
  updateOAuthCredentials,
  type OAuthConnectionCredentials,
} from "@/modules/data-sources/oauth-queries";
import { supabaseOAuthClientId, supabaseOAuthClientSecret, supabaseOAuthRedirectUri } from "./config";

/**
 * Pure OAuth 2.1 helpers for Supabase's third-party OAuth server, via direct
 * fetch (no Supabase SDK dep). SERVER-ONLY: handles client secrets and
 * refresh tokens.
 *
 * Verified against Supabase's current docs (not training-data defaults):
 * - Authorize: GET https://api.supabase.com/v1/oauth/authorize
 *   (client_id, redirect_uri, response_type=code, state, code_challenge,
 *   code_challenge_method=S256 — scope is deprecated, configured on the app).
 * - Token: POST https://api.supabase.com/v1/oauth/token, form-urlencoded,
 *   client authenticates via HTTP Basic (client_id:client_secret), body
 *   carries grant_type/code/redirect_uri/code_verifier (or refresh_token).
 * - PKCE is Supabase's strongly recommended flow for all OAuth clients, so
 *   this always builds and sends a code_challenge/code_verifier regardless
 *   of confidential-client status.
 */

const AUTH_ENDPOINT = "https://api.supabase.com/v1/oauth/authorize";
const TOKEN_ENDPOINT = "https://api.supabase.com/v1/oauth/token";

/** Generates a fresh PKCE code_verifier (S256) and its derived code_challenge. */
export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  // RFC 7636: 43-128 char unreserved-charset string. 32 random bytes,
  // base64url-encoded, yields a 43-char verifier — within spec.
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

/** Build the Supabase consent-screen URL for a given signed state + PKCE challenge. */
export function buildAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: supabaseOAuthClientId(),
    redirect_uri: supabaseOAuthRedirectUri(),
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** HTTP Basic `Authorization` header for client_id:client_secret, per Supabase's token endpoint. */
function basicAuthHeader(): string {
  const raw = `${supabaseOAuthClientId()}:${supabaseOAuthClientSecret()}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

export type ExchangedTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scope: string;
};

/** Exchange an authorization code for tokens (initial connect). PKCE-required. */
export async function exchangeCode(code: string, codeVerifier: string): Promise<ExchangedTokens> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: supabaseOAuthRedirectUri(),
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) {
    throw new Error(`Supabase token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in,
    scope: data.scope ?? "",
  };
}

export type RefreshedTokens = { accessToken: string; expiresIn: number; scope: string };

/** Exchange a refresh token for a fresh access token. */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshedTokens> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Supabase token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as TokenResponse;
  return { accessToken: data.access_token, expiresIn: data.expires_in, scope: data.scope ?? "" };
}

/** Small safety margin so a token doesn't expire mid-request. */
const EXPIRY_SKEW_MS = 60_000;

/**
 * Returns a valid access token for the OAuth connection `id`, refreshing
 * (and persisting the refreshed credentials) when the cached one is expired
 * or missing. Returns null when the connection doesn't exist or its stored
 * credentials are invalid (defensive — should never happen for a row this
 * module wrote itself).
 */
export async function getAccessToken(id: string): Promise<string | null> {
  const creds = await getOAuthCredentials(id);
  if (!creds) return null;

  const now = Date.now();
  if (creds.accessToken && creds.accessTokenExpiresAt && creds.accessTokenExpiresAt - EXPIRY_SKEW_MS > now) {
    return creds.accessToken;
  }

  const refreshed = await refreshAccessToken(creds.refreshToken);
  const next: OAuthConnectionCredentials = {
    refreshToken: creds.refreshToken,
    accessToken: refreshed.accessToken,
    accessTokenExpiresAt: now + refreshed.expiresIn * 1000,
    scope: refreshed.scope || creds.scope,
  };
  await updateOAuthCredentials(id, next, next.accessTokenExpiresAt ?? null);
  return refreshed.accessToken;
}
