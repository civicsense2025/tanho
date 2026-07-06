import { NextResponse, type NextRequest } from "next/server";
import { updateTag } from "next/cache";
import { requireUser } from "@/modules/auth/guards";
import { saveConnection, type OAuthCredentials } from "@/modules/integrations";
import { writeAudit } from "@/modules/audit/log";
import { exchangeCode } from "@/adapters/google/oauth";
import { verifyOAuthState } from "@/adapters/google/state";
import type { GoogleProvider } from "@/adapters/google/config";

/**
 * True when an error is a Next.js `redirect()` control-flow throw. Those carry a
 * `digest` string beginning with `NEXT_REDIRECT` and MUST be re-thrown so Next
 * can perform the navigation — swallowing one would break the redirect. Used to
 * tell an anonymous caller (redirected to /admin/login by requireUser) apart
 * from an authenticated non-owner (a plain thrown Error we handle gracefully).
 */
function isNextRedirect(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/**
 * GET /api/oauth/google/callback — the single redirect URI registered on the
 * deployment's Google OAuth app for all three surfaces. Verifies the signed
 * state (CSRF + carries which provider started the flow), exchanges the code,
 * fetches the connected account's email for display, and saves the sealed
 * connection. Never exposes tokens in the redirect — only success/error flags.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;

  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const verified = state ? verifyOAuthState(state) : null;
  const provider = verified?.provider ?? null;
  const origin = verified?.origin ?? "web";
  const returnPath = provider ? RETURN_PATHS[provider] ?? "/admin" : "/admin";

  // Owner-gate. An UNauthenticated caller is redirected to /admin/login by
  // requireUser (its thrown NEXT_REDIRECT propagates — correct, since we can't
  // bounce an anonymous user to the app scheme). An authenticated-but-non-owner
  // (editor) throws a plain Error; catch THAT and fail gracefully back to the
  // caller's origin (a clean ?error=1) instead of surfacing a raw 500 — which
  // is now user-visible inside the app's ASWebAuthenticationSession browser.
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser("owner");
  } catch (e) {
    if (isNextRedirect(e)) throw e; // anonymous → let the login redirect happen
    return oauthRedirect(request, origin, returnPath, false);
  }

  if (error || !code || !provider) {
    return oauthRedirect(request, origin, returnPath, false);
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

    return oauthRedirect(request, origin, returnPath, true);
  } catch (err) {
    console.error(`[oauth] Google callback failed for ${provider}`, err);
    return oauthRedirect(request, origin, returnPath, false);
  }
}

/** Where each Google surface's admin screen lives, for the post-connect redirect. */
const RETURN_PATHS: Record<GoogleProvider, string> = {
  "google-calendar": "/admin/scheduling?tab=availability",
  "google-analytics": "/admin/analytics/overview",
  "google-search-console": "/admin/analytics/traffic",
};

/** The native app's custom-scheme callback that ASWebAuthenticationSession waits for. */
const APP_CALLBACK_SCHEME = "oys://oauth-callback";

/**
 * Redirect after the callback. A WEB flow returns to the relevant admin page;
 * an APP flow (started via the native ASWebAuthenticationSession) returns to the
 * `oys://` scheme, which the app intercepts to close the auth session. No tokens
 * are ever put in the redirect — only a success/error flag.
 */
function oauthRedirect(
  request: NextRequest,
  origin: "web" | "app",
  returnPath: string,
  ok: boolean,
): Response {
  if (origin === "app") {
    return NextResponse.redirect(`${APP_CALLBACK_SCHEME}?${ok ? "connected=1" : "error=1"}`);
  }
  const flag = ok ? "google_connected=1" : "google_error=1";
  return NextResponse.redirect(new URL(`${returnPath}?${flag}`, request.url));
}

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
