import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/modules/auth/guards";
import { GOOGLE_PROVIDERS } from "@/modules/integrations";
import { isGoogleOAuthConfigured } from "@/adapters/google/config";
import { buildAuthUrl } from "@/adapters/google/oauth";
import { makeOAuthState } from "@/adapters/google/state";

/**
 * GET /api/oauth/google/[provider] — owner-only. Starts the Google OAuth
 * round-trip for one of the three Google surfaces (Calendar, GA4, Search
 * Console) by redirecting to Google's consent screen with a signed state.
 * BYO: 501s cleanly when the deployment hasn't set its own Google OAuth
 * client id/secret, so a fresh clone never crashes on this route.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<Response> {
  // Owner-only: connecting an external account is an owner-level decision.
  // requireUser redirects unauthenticated users to /admin/login and throws
  // for a non-owner editor — both acceptable outcomes for this route.
  await requireUser("owner");

  const { provider } = await params;
  if (!(GOOGLE_PROVIDERS as readonly string[]).includes(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET." },
      { status: 501 },
    );
  }

  const state = makeOAuthState(provider);
  const url = buildAuthUrl(provider as (typeof GOOGLE_PROVIDERS)[number], state);
  return NextResponse.redirect(url);
}
