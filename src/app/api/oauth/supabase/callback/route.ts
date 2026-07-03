import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { saveOAuthConnection } from "@/modules/data-sources/oauth-queries";
import { exchangeCode } from "@/adapters/supabase-oauth/oauth";
import { verifyOAuthState } from "@/adapters/supabase-oauth/state";

/**
 * GET /api/oauth/supabase/callback — the single redirect URI registered on
 * the deployment's Supabase OAuth app. Verifies the signed state (CSRF +
 * carries the PKCE code_verifier and which action started the flow),
 * exchanges the code, saves the sealed OAuth connection, and redirects to
 * the picker screen so the owner can create a new project or connect an
 * existing one. Never exposes tokens in the redirect — only the new
 * connection's id and success/error flags. Mirrors
 * api/oauth/google/callback.
 */
const PICKER_PATH = "/admin/settings/data-sources/connect-supabase";

export async function GET(request: NextRequest): Promise<Response> {
  const user = await requireUser("owner");
  const { searchParams } = request.nextUrl;

  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const statePayload = state ? verifyOAuthState(state) : null;

  if (error || !code || !statePayload) {
    return NextResponse.redirect(new URL(`${PICKER_PATH}?supabase_error=1`, request.url));
  }

  try {
    const tokens = await exchangeCode(code, statePayload.codeVerifier);
    if (!tokens.refreshToken) {
      throw new Error("No refresh token returned by Supabase");
    }

    const id = await saveOAuthConnection({
      credentials: {
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
        scope: tokens.scope,
      },
      scopes: tokens.scope,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    });

    await writeAudit({
      userId: user.id,
      action: "data_source.oauth_connect",
      ownerType: "data_source_oauth_connection",
      ownerId: id,
    });

    return NextResponse.redirect(
      new URL(`${PICKER_PATH}?oauth=${id}&intent=${statePayload.intent}`, request.url),
    );
  } catch (err) {
    console.error("[oauth] Supabase callback failed", err instanceof Error ? err.message : "unknown error");
    return NextResponse.redirect(new URL(`${PICKER_PATH}?supabase_error=1`, request.url));
  }
}
