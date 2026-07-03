import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import {
  AI_CRAWLERS_DEFAULTS,
  aiCrawlersSettingsSchema,
  type AiCrawlersSettings,
} from "./validation";

/**
 * Cached AI & crawlers settings. Revalidated via updateTag("settings:ai_crawlers")
 * on save. Falls back to neutral defaults so robots.txt / llms.txt render before
 * the namespace is seeded.
 */
export async function getAiCrawlersSettings(): Promise<AiCrawlersSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:ai_crawlers");
  const data = await readSettingRow("ai_crawlers");
  const parsed = aiCrawlersSettingsSchema.safeParse(data);
  return parsed.success ? parsed.data : AI_CRAWLERS_DEFAULTS;
}
