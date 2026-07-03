import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { readSettingRow } from "@/modules/settings/queries";

/**
 * The `content_types` settings namespace — which content types the owner has
 * turned OFF. A disabled type is hidden from the public site (routing) and from
 * search (sitemap/robots). Built-in core types (page/post) can't be disabled;
 * everything else (products, collections, projects, guides, resources, and
 * custom types) can.
 *
 * Stored as a set of type keys; absent = all on. This is the platform's real
 * `disabledTypes` state (the design's on/off toggles bind to it).
 */
export const contentTypesSettingsSchema = z.object({
  disabled: z.array(z.string().max(60)).max(100).default([]),
});

export type ContentTypesSettings = z.infer<typeof contentTypesSettingsSchema>;
export const CONTENT_TYPES_DEFAULTS: ContentTypesSettings = contentTypesSettingsSchema.parse({});

/** Core types that can never be turned off (the site needs pages). */
export const ALWAYS_ON_TYPES = new Set(["page", "post"]);

/** Cached disabled-types set. Revalidated via updateTag("settings:content_types"). */
export async function getContentTypesSettings(): Promise<ContentTypesSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:content_types");
  const parsed = contentTypesSettingsSchema.safeParse(await readSettingRow("content_types"));
  return parsed.success ? parsed.data : CONTENT_TYPES_DEFAULTS;
}

/** Uncached read (server actions / read-your-own-writes). */
export async function readContentTypesSettings(): Promise<ContentTypesSettings> {
  const parsed = contentTypesSettingsSchema.safeParse(await readSettingRow("content_types"));
  return parsed.success ? parsed.data : CONTENT_TYPES_DEFAULTS;
}

/** True when a type key is turned off (never true for always-on core types). */
export function isTypeDisabled(settings: ContentTypesSettings, typeKey: string): boolean {
  if (ALWAYS_ON_TYPES.has(typeKey)) return false;
  return settings.disabled.includes(typeKey);
}
