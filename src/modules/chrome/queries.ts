import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import {
  ANNOUNCEMENT_DEFAULTS,
  announcementConfigSchema,
  FOOTER_DEFAULTS,
  footerConfigSchema,
  HEADER_DEFAULTS,
  headerConfigSchema,
  type AnnouncementConfig,
  type FooterConfig,
  type HeaderConfig,
} from "./validation";

/**
 * Cached chrome config readers. Each is revalidated by
 * saveSettings("<ns>") → updateTag("settings:<ns>"), and falls back to the
 * code defaults when the row is missing or invalid — the site always
 * renders, even unseeded.
 */

export async function getHeaderConfig(): Promise<HeaderConfig> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:header");
  const parsed = headerConfigSchema.safeParse(await readSettingRow("header"));
  return parsed.success ? parsed.data : HEADER_DEFAULTS;
}

export async function getFooterConfig(): Promise<FooterConfig> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:footer");
  const parsed = footerConfigSchema.safeParse(await readSettingRow("footer"));
  return parsed.success ? parsed.data : FOOTER_DEFAULTS;
}

export async function getAnnouncementConfig(): Promise<AnnouncementConfig> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:announcement");
  const parsed = announcementConfigSchema.safeParse(await readSettingRow("announcement"));
  return parsed.success ? parsed.data : ANNOUNCEMENT_DEFAULTS;
}

/**
 * Current year for the derived copyright line. Cache Components treats
 * `new Date()` as dynamic, so it's cached with a daily lifetime — the
 * footer stays in the static shell and the year is correct within a day.
 */
export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
