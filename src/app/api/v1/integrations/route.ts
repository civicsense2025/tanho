import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { connectionSummary } from "@/modules/integrations/queries";
import { INTEGRATION_PROVIDERS } from "@/modules/integrations/validation";
import { isGoogleOAuthConfigured } from "@/adapters/google/config";
import { handle, ok } from "@/lib/api/v1";

/**
 * GET /api/v1/integrations — list every integration provider with its current
 * connection summary (or null when unconnected). Owner-only. Credentials are
 * never included — only non-secret display fields (status, accountLabel,
 * scopes, timestamps). Also reports whether Google OAuth is configured on this
 * deployment, so the app can show the connect affordance vs a setup hint.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    const providers = await Promise.all(
      INTEGRATION_PROVIDERS.map(async (provider) => ({
        provider,
        summary: await connectionSummary(provider),
      })),
    );
    return ok({
      providers,
      googleOAuthConfigured: isGoogleOAuthConfigured(),
    });
  });
}
