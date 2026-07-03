import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/modules/auth/guards";
import { isSupabaseOAuthConfigured } from "@/adapters/supabase-oauth/config";
import { buildAuthUrl, generatePkcePair } from "@/adapters/supabase-oauth/oauth";
import { makeOAuthState, type SupabaseOAuthIntent } from "@/adapters/supabase-oauth/state";

/**
 * GET /api/oauth/supabase — owner-only. Starts the Supabase OAuth round-trip
 * by redirecting to Supabase's authorize endpoint with a signed state (which
 * carries the intent — "create" a new project or "connect" an existing one
 * — plus the PKCE code_verifier, since there's no server session to stash it
 * in between this redirect and the callback). BYO: 501s cleanly when the
 * deployment hasn't set its own Supabase OAuth client id/secret, so a fresh
 * clone never crashes on this route. Mirrors api/oauth/google/[provider].
 */
export async function GET(request: NextRequest): Promise<Response> {
  // Owner-only: connecting an external account is an owner-level decision.
  await requireUser("owner");

  if (!isSupabaseOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase OAuth is not configured. Set SUPABASE_OAUTH_CLIENT_ID and SUPABASE_OAUTH_CLIENT_SECRET.",
      },
      { status: 501 },
    );
  }

  const intentParam = request.nextUrl.searchParams.get("intent");
  const intent: SupabaseOAuthIntent = intentParam === "create" ? "create" : "connect";

  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = makeOAuthState({ intent, codeVerifier });
  const url = buildAuthUrl(state, codeChallenge);
  return NextResponse.redirect(url);
}
