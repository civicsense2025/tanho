import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import {
  ANALYTICS_DEFAULTS,
  analyticsSettingsSchema,
  type AnalyticsSettings,
} from "./validation";

/**
 * Cached analytics connect-state (settings:analytics). Drives the admin
 * connect gates. Revalidated by the connect/disconnect actions. Falls back to
 * both flags off so the screens render their gates before any seed runs.
 */
export async function getAnalyticsSettings(): Promise<AnalyticsSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:analytics");
  const data = await readSettingRow("analytics");
  const parsed = analyticsSettingsSchema.safeParse(data);
  return parsed.success ? parsed.data : ANALYTICS_DEFAULTS;
}
