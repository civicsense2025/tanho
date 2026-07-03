"use server";

import { updateTag } from "next/cache";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { settings } from "@/modules/settings/schema";
import { marketplaceSettingsSchema } from "./schema";

export type SaveMarketplaceState = { ok?: boolean; error?: string };

/**
 * Save the marketplace settings. Owner-only; the payload is parsed against the
 * marketplace zod schema and upserted into the `settings` table under namespace
 * "marketplace". Revalidates the "marketplace" cache tag (read-your-own-writes)
 * and writes an audit entry.
 */
export async function saveMarketplaceSettings(
  input: unknown,
): Promise<SaveMarketplaceState> {
  const user = await requireUser("owner");

  const parsed = marketplaceSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }

  await db
    .insert(settings)
    .values({ namespace: "marketplace", data: parsed.data, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data: parsed.data, updatedAt: Date.now() },
    });

  updateTag("marketplace");
  await writeAudit({
    userId: user.id,
    action: "settings.save",
    ownerType: "settings",
    ownerId: "marketplace",
  });
  return { ok: true };
}
