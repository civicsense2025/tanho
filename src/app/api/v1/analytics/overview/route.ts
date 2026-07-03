import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { overview, topPages, eventsOverTime } from "@/modules/analytics/queries";
import { handle, ok } from "@/lib/api/v1";

/**
 * GET /api/v1/analytics/overview — top-line metrics (visitors, pageviews,
 * events, pages) for the last ?days=30 plus the prior window for trend deltas.
 * Optional ?days= override. Editor+.
 */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
    const [ov, pages, series] = await Promise.all([
      overview(days),
      topPages(days, 10),
      eventsOverTime(14),
    ]);
    return ok({ overview: ov, topPages: pages, series });
  });
}
