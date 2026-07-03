import type { AnalyticsReadAdapter } from "../types";
import { overview, topPages, topQueries } from "@/modules/analytics/queries";

/**
 * First-party analytics adapter — reads the local analytics_events table. Always
 * "configured" (there's nothing to connect); it just reads whatever the site's
 * own beacon has recorded. The admin's Google connect gates are a separate,
 * settings-driven concern (see modules/analytics/settings.ts).
 */
export const internalAnalytics: AnalyticsReadAdapter = {
  isConfigured: () => true,
  overview: (days) => overview(days),
  topPages: (days, limit) => topPages(days, limit),
  topQueries: () => topQueries(),
};
