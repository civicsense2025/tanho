import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import { SEO_DEFAULTS, seoSettingsSchema, type SeoSettings } from "./validation";

/**
 * Cached SEO settings. Revalidated via updateTag("settings:seo") on save.
 * Falls back to neutral defaults so the sitemap/metadata render before the
 * namespace is seeded.
 */
export async function getSeoSettings(): Promise<SeoSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:seo");
  const data = await readSettingRow("seo");
  const parsed = seoSettingsSchema.safeParse(data);
  return parsed.success ? parsed.data : SEO_DEFAULTS;
}
