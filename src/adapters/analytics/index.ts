import type { AnalyticsReadAdapter } from "../types";
import { internalAnalytics } from "./internal";
import { ga4Analytics } from "./ga4";

/**
 * The active analytics read source. Picks the real GA4/Search Console
 * adapter when Google OAuth is configured (BYO client id/secret) AND at
 * least one of the two surfaces is connected; otherwise the first-party
 * internal adapter, matching current behavior with zero env vars. ga4Analytics
 * itself falls back to internal per-call on any live-request failure, so a
 * transient Google API error never breaks the admin. See docs/architecture/adapters.md.
 */
export async function getAnalyticsRead(): Promise<AnalyticsReadAdapter> {
  return (await ga4Analytics.isConfigured()) ? ga4Analytics : internalAnalytics;
}

/** Synchronous default export kept for callers that can't await a selector. */
export const analyticsRead: AnalyticsReadAdapter = internalAnalytics;
