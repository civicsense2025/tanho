import type { VercelConfig } from "@vercel/config/v1";

/**
 * 15-minute polling: publish latency of "up to ~14 minutes" is imperceptible for a solo creator
 * scheduling a post, and it's a quarter of the invocation volume 5-minute polling would cost.
 * Vercel auto-attaches `Authorization: Bearer $CRON_SECRET` to this request when the CRON_SECRET
 * env var is set on the project -- see src/app/api/cron/publish-scheduled/route.ts.
 */
export const config: VercelConfig = {
  crons: [{ path: "/api/cron/publish-scheduled", schedule: "*/15 * * * *" }],
};
