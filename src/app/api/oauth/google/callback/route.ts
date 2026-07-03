import { NextResponse, type NextRequest } from "next/server";
import { updateTag } from "next/cache";
import { requireUser } from "@/modules/auth/guards";
import { saveConnection, type OAuthCredentials } from "@/modules/integrations";
import { writeAudit } from "@/modules/audit/log";
import { exchangeCode } from "@/adapters/google/oauth";
import { verifyOAuthState } from "@/adapters/google/state";
import type { GoogleProvider } from "@/adapters/google/config";

/**
 * GET /api/oauth/google/callback — the single redirect URI registered on the
 * deployment's Google OAuth app for all three surfaces. Verifies the signed
 * state (CSRF + carries which provider started the flow), exchanges the code,
 * fetches the connected account's email for display, and saves the sealed
 * connection. Never exposes tokens in the redirect — only success/error flags.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const user = await requireUser("owner");
  const { searchParams } = request.nextUrl;

  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const provider = state ? verifyOAuthState(state) : null;
  const returnPath = provider ? RETURN_PATHS[provider] ?? "/admin" : "/admin";

  if (error || !code || !provider) {
    return NextResponse.redirect(new URL(`${returnPath}?google_error=1`, request.url));
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refreshToken) {
      // Google omits refresh_token on repeat consents without prompt=consent
      // forcing re-auth; we always pass prompt=consent so this should be rare.
      throw new Error("No refresh token returned by Google");
    }

    const accountLabel = await fetchAccountLabel(tokens.accessToken);

    const credentials: OAuthCredentials = {
      kind: "oauth",
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
      scope: tokens.scope,
    };

    await saveConnection({
      provider,
      credentials,
      accountLabel,
      scopes: tokens.scope,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      status: "connected",
    });
    updateTag(`integration:${provider}`);
    await writeAudit({
      userId: user.id,
      action: "integration.connect",
      ownerType: "integration",
      ownerId: provider,
    });

    return NextResponse.redirect(new URL(`${returnPath}?google_connected=1`, request.url));
  } catch (err) {
    console.error(`[oauth] Google callback failed for ${provider}`, err);
    return NextResponse.redirect(new URL(`${returnPath}?google_error=1`, request.url));
  }
}

/** Where each Google surface's admin screen lives, for the post-connect redirect. */
const RETURN_PATHS: Record<GoogleProvider, string> = {
  "google-calendar": "/admin/scheduling?tab=availability",
  "google-analytics": "/admin/analytics/overview",
  "google-search-console": "/admin/analytics/traffic",
};

/** Best-effort account email for display; never fails the connect on error. */
async function fetchAccountLabel(accessToken: string): Promise<string> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { email?: string };
    return data.email ?? "";
  } catch {
    return "";
  }
}
