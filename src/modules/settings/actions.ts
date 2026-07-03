"use server";

import { updateTag } from "next/cache";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { settings } from "./schema";
import { settingsSchemas } from "./validation";

export type SaveSettingsState = { ok?: boolean; error?: string };

/**
 * Upserts one settings namespace. Owner-only; the namespace must exist in
 * the settingsSchemas allowlist and the payload must parse against it.
 */
export async function saveSettings(
  namespace: string,
  data: unknown,
): Promise<SaveSettingsState> {
  const user = await requireUser("owner");

  const schema = settingsSchemas[namespace];
  if (!schema) return { error: `Unknown settings namespace: ${namespace}` };

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }

  await db
    .insert(settings)
    .values({ namespace, data: parsed.data, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data: parsed.data, updatedAt: Date.now() },
    });

  // Immediate expiry (read-your-own-writes) so the admin sees the change now.
  updateTag(`settings:${namespace}`);
  await writeAudit({
    userId: user.id,
    action: "settings.save",
    ownerType: "settings",
    ownerId: namespace,
  });
  return { ok: true };
}
