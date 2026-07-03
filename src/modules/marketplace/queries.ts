import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import {
  MARKETPLACE_DEFAULTS,
  marketplaceSettingsSchema,
  type MarketplaceSettings,
} from "./schema";

/**
 * Cached marketplace settings. Revalidated via updateTag("marketplace") on
 * save. Falls back to neutral defaults (disabled, private) so the site renders
 * before the namespace is seeded.
 */
export async function getMarketplaceSettings(): Promise<MarketplaceSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("marketplace");
  const data = await readSettingRow("marketplace");
  const parsed = marketplaceSettingsSchema.safeParse(data);
  return parsed.success ? parsed.data : MARKETPLACE_DEFAULTS;
}
