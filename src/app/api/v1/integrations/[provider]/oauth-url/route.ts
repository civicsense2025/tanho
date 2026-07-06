import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { GOOGLE_PROVIDERS } from "@/modules/integrations/validation";
import { isGoogleOAuthConfigured } from "@/adapters/google/config";
import { buildAuthUrl } from "@/adapters/google/oauth";
import { makeOAuthState } from "@/adapters/google/state";
import { handle, ok, fail } from "@/lib/api/v1";

/**
 * GET /api/v1/integrations/:provider/oauth-url — mint the Google consent URL for
 * a native-app OAuth flow. Owner-only. The state is signed with origin="app",
 * so the shared Google callback redirects to the app's `oys://` scheme when the
 * flow completes (instead of a web admin page). The app opens the returned URL
 * in ASWebAuthenticationSession(callbackURLScheme: "oys").
 *
 * Only the three Google surfaces use OAuth; a non-Google provider is rejected.
 * 501s cleanly when the deployment hasn't configured its own Google OAuth app.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ provider: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    const { provider } = await params;
    if (!(GOOGLE_PROVIDERS as readonly string[]).includes(provider)) {
      return fail("This provider does not use OAuth.", 404);
    }
    if (!isGoogleOAuthConfigured()) {
      return fail("Google OAuth isn't configured on this site yet.", 501);
    }
    const state = makeOAuthState(provider, "app");
    const url = buildAuthUrl(provider as (typeof GOOGLE_PROVIDERS)[number], state);
    return ok({ url, callbackScheme: "oys" });
  });
}
