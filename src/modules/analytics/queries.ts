import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { analyticsEvents } from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AnalyticsOverview = {
  /** Distinct anon sessions in the window. */
  visitors: number;
  /** Count of name='pageview' events in the window. */
  pageviews: number;
  /** All events in the window (any name). */
  events: number;
  /** Distinct pages that received a pageview. */
  pages: number;
  windowDays: number;
  /** Same four metrics for the immediately preceding window of equal length
   *  (e.g. days 31–60 when windowDays=30) — powers the KPI trend indicators. */
  prior: {
    visitors: number;
    pageviews: number;
    events: number;
    pages: number;
  };
};

export type PageStat = {
  path: string;
  /** Total pageview events (every visit counts). */
  views: number;
  /** Distinct visitors — a logged-in person counts once (even across
   *  sessions/devices); an anonymous browser counts once by session. */
  uniques: number;
};
export type QueryStat = { query: string; clicks: number; ctr: number };
export type DayBucket = { day: string; count: number };

/** Window start (ms) for the last `days` days. */
function since(days: number): number {
  return Date.now() - days * DAY_MS;
}

/**
 * Top-line internal metrics from analytics_events over the last `days` days,
 * plus the same metrics for the prior `days`-length window (e.g. days 31–60
 * when days=30) so callers can compute a real period-over-period delta.
 * One query, two date-range aggregates — parameterized aggregate reads;
 * admin is dynamic, so these are uncached.
 */
export async function overview(days = 30): Promise<AnalyticsOverview> {
  const from = since(days);
  const priorFrom = since(days * 2);
  const visitorKey = sql`coalesce(${analyticsEvents.personId}, ${analyticsEvents.sessionId})`;
  const inCurrent = sql`${analyticsEvents.at} >= ${from}`;
  const inPrior = sql`${analyticsEvents.at} >= ${priorFrom} and ${analyticsEvents.at} < ${from}`;
  const [row] = await db
    .select({
      // Distinct visitors: a person once (even across sessions/devices), an
      // anonymous browser once by session — same keying as topPages.uniques.
      visitors: sql<number>`count(distinct case when ${inCurrent} then ${visitorKey} end)`,
      events: sql<number>`sum(case when ${inCurrent} then 1 else 0 end)`,
      pageviews: sql<number>`sum(case when ${inCurrent} and ${analyticsEvents.name} = 'pageview' then 1 else 0 end)`,
      pages: sql<number>`count(distinct case when ${inCurrent} and ${analyticsEvents.name} = 'pageview' then ${analyticsEvents.path} end)`,
      priorVisitors: sql<number>`count(distinct case when ${inPrior} then ${visitorKey} end)`,
      priorEvents: sql<number>`sum(case when ${inPrior} then 1 else 0 end)`,
      priorPageviews: sql<number>`sum(case when ${inPrior} and ${analyticsEvents.name} = 'pageview' then 1 else 0 end)`,
      priorPages: sql<number>`count(distinct case when ${inPrior} and ${analyticsEvents.name} = 'pageview' then ${analyticsEvents.path} end)`,
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.at, priorFrom));

  return {
    visitors: Number(row?.visitors ?? 0),
    pageviews: Number(row?.pageviews ?? 0),
    events: Number(row?.events ?? 0),
    pages: Number(row?.pages ?? 0),
    windowDays: days,
    prior: {
      visitors: Number(row?.priorVisitors ?? 0),
      pageviews: Number(row?.priorPageviews ?? 0),
      events: Number(row?.priorEvents ?? 0),
      pages: Number(row?.priorPages ?? 0),
    },
  };
}

/**
 * Most-viewed pages (name='pageview') over the window, highest first.
 * `views` is total hits; `uniques` counts distinct visitors, keying on the
 * person when logged in and falling back to the anon session id otherwise —
 * so a person is one unique across sessions, an anon browser one by session.
 */
export async function topPages(days = 30, limit = 10): Promise<PageStat[]> {
  const visitorKey = sql`coalesce(${analyticsEvents.personId}, ${analyticsEvents.sessionId})`;
  const rows = await db
    .select({
      path: analyticsEvents.path,
      views: sql<number>`count(*)`,
      uniques: sql<number>`count(distinct ${visitorKey})`,
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.name, "pageview"), gte(analyticsEvents.at, since(days))))
    .groupBy(analyticsEvents.path)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows.map((r) => ({
    path: r.path || "/",
    views: Number(r.views),
    uniques: Number(r.uniques),
  }));
}

/**
 * Search queries. First-party analytics can't see Google search terms — that
 * data only exists once Search Console is really connected. Until then this
 * returns an empty list and the screen shows an honest empty state.
 */
export async function topQueries(): Promise<QueryStat[]> {
  return [];
}

/** Per-day pageview buckets for the overview bar chart, oldest first. */
export async function eventsOverTime(days = 14): Promise<DayBucket[]> {
  const from = since(days);
  const rows = await db
    .select({
      day: sql<string>`date(${analyticsEvents.at} / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.name, "pageview"), gte(analyticsEvents.at, from)))
    .groupBy(sql`date(${analyticsEvents.at} / 1000, 'unixepoch')`)
    .orderBy(sql`date(${analyticsEvents.at} / 1000, 'unixepoch')`);

  const byDay = new Map(rows.map((r) => [r.day, Number(r.count)]));
  const out: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    out.push({ day: d, count: byDay.get(d) ?? 0 });
  }
  return out;
}
