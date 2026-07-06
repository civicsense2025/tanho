import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { saveConnection, deleteConnection } from "@/modules/integrations/queries";
import {
  apiKeyCredentialsSchema,
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from "@/modules/integrations/validation";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

function isProvider(p: string): p is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(p);
}

/**
 * PUT /api/v1/integrations/:provider — connect an API-KEY integration (the AI
 * provider). Owner-only. Body: { apiKey, baseUrl? } — sealed via saveConnection
 * before storage, never echoed back. OAuth providers (the three Google
 * surfaces) do NOT connect here — they go through the OAuth flow
 * (`:provider/oauth-url` + the Google callback), so a PUT for a Google provider
 * is rejected.
 *
 * DELETE /api/v1/integrations/:provider — disconnect any provider (owner-only),
 * removing the sealed credentials. Mirrors disconnectIntegration.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ provider: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { provider } = await params;
    if (!isProvider(provider)) return fail("Unknown provider", 404);
    if (provider !== "ai") {
      return fail("This provider connects via OAuth, not an API key.", 400);
    }
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = apiKeyCredentialsSchema.safeParse({ kind: "api-key", ...(body as object) });
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid API key", 400);
    }
    await saveConnection({
      provider,
      credentials: parsed.data,
      accountLabel: parsed.data.baseUrl ? new URL(parsed.data.baseUrl).host : "API key",
      status: "connected",
    });
    revalidateTag(`integration:${provider}`, "max");
    await writeAudit({ userId: user.id, action: "integration.connect", ownerType: "integration", ownerId: provider });
    return ok();
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ provider: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { provider } = await params;
    if (!isProvider(provider)) return fail("Unknown provider", 404);
    await deleteConnection(provider);
    revalidateTag(`integration:${provider}`, "max");
    await writeAudit({ userId: user.id, action: "integration.disconnect", ownerType: "integration", ownerId: provider });
    return ok();
  });
}
