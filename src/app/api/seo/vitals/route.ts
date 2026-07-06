import { NextResponse, type NextRequest } from "next/server";
import { ensureAnonId } from "@/modules/analytics/session-cookie";
import { allowEvent } from "@/modules/analytics/rate-limit";
import { recordWebVitals } from "@/modules/seo/audit/tracking";

/**
 * Core Web Vitals RUM beacon (client → here). Like /api/track it is
 * deliberately permissive: always returns 204 (even on bad input) so it can
 * never break a page, reflects nothing back, and is rate-limited per anon id.
 * The writer re-validates the metric/rating and swallows failures.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return res;
  }
  if (typeof body !== "object" || body === null) return res;

  const b = body as Record<string, unknown>;
  const metric = typeof b.metric === "string" ? b.metric : "";
  const value = typeof b.value === "number" ? b.value : NaN;
  const rating = typeof b.rating === "string" ? b.rating : "";
  const path = typeof b.path === "string" ? b.path : "";

  const sessionId = ensureAnonId(req, res);
  if (!allowEvent(`vitals:${sessionId}`)) return res;

  await recordWebVitals({ path, metric, value, rating });
  return res;
}
