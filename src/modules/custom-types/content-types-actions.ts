"use server";

import { updateTag } from "next/cache";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { settings } from "@/modules/settings/schema";
import {
  ALWAYS_ON_TYPES,
  contentTypesSettingsSchema,
  readContentTypesSettings,
} from "./content-types-settings";

export type ToggleState = { ok: true; disabled: boolean } | { ok: false; error: string };

/**
 * Turn a content type on or off (owner-only). A disabled type is hidden from
 * the public site and search (sitemap/robots) — the walker + sitemap read
 * `content_types.disabled`. Core types (page/post) can't be disabled.
 */
export async function toggleContentType(typeKey: string): Promise<ToggleState> {
  const user = await requireUser("owner");
  if (ALWAYS_ON_TYPES.has(typeKey)) {
    return { ok: false, error: "This type can't be turned off." };
  }

  const current = await readContentTypesSettings();
  const set = new Set(current.disabled);
  const nowDisabled = !set.has(typeKey);
  if (nowDisabled) set.add(typeKey);
  else set.delete(typeKey);

  const next = contentTypesSettingsSchema.parse({ disabled: [...set] });
  await db
    .insert(settings)
    .values({ namespace: "content_types", data: next, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data: next, updatedAt: Date.now() },
    });

  // A type change affects routing, the sitemap, robots, and entity listings.
  updateTag("settings:content_types");
  updateTag("entries");
  updateTag("pages");
  await writeAudit({
    userId: user.id,
    action: nowDisabled ? "content_type.disable" : "content_type.enable",
    ownerType: "content_type",
    ownerId: typeKey,
  });
  return { ok: true, disabled: nowDisabled };
}
