"use server";

import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { updateTag } from "next/cache";
import { deleteConnection } from "./queries";
import { INTEGRATION_PROVIDERS, type IntegrationProvider } from "./validation";

/**
 * Disconnect a BYO integration (owner-only, audited). Removes the sealed
 * credentials so the feature falls back to its unconfigured/graceful state.
 * The connect side is a redirect-based OAuth flow (see adapters/google) or a
 * key-entry action per provider; both funnel through the queries writer.
 */
export async function disconnectIntegration(
  provider: IntegrationProvider,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser("owner");
  if (!INTEGRATION_PROVIDERS.includes(provider)) {
    return { ok: false, error: "Unknown provider" };
  }
  await deleteConnection(provider);
  updateTag(`integration:${provider}`);
  await writeAudit({
    userId: user.id,
    action: "integration.disconnect",
    ownerType: "integration",
    ownerId: provider,
  });
  return { ok: true };
}
