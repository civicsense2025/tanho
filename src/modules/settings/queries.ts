import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings } from "./schema";
import {
  APPEARANCE_DEFAULTS,
  GENERAL_DEFAULTS,
  appearanceSettingsSchema,
  generalSettingsSchema,
  type AppearanceSettings,
  type GeneralSettings,
} from "./validation";

/** Uncached read — for seeds, scripts, and server actions. */
export async function readSettingRow(namespace: string): Promise<unknown> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.namespace, namespace),
  });
  return row?.data;
}

/**
 * Cached general settings. Revalidated via revalidateTag("settings:general")
 * whenever the namespace is written. Falls back to neutral defaults so the
 * site renders even before seeding.
 */
export async function getGeneralSettings(): Promise<GeneralSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:general");
  const data = await readSettingRow("general");
  const parsed = generalSettingsSchema.safeParse(data);
  return parsed.success ? parsed.data : GENERAL_DEFAULTS;
}

/**
 * Cached appearance settings. Revalidated via revalidateTag("settings:appearance")
 * whenever the namespace is written. Falls back to neutral defaults so the
 * site renders even before seeding.
 */
export async function getAppearanceSettings(): Promise<AppearanceSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:appearance");
  const data = await readSettingRow("appearance");
  const parsed = appearanceSettingsSchema.safeParse(data);
  return parsed.success ? parsed.data : APPEARANCE_DEFAULTS;
}
