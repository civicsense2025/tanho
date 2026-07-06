import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/modules/analytics/schema";
import { memberships, people } from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export type QuietReaderRow = {
  personId: string;
  name: string;
  email: string;
  tier: string;
  recentViews: number;
  priorViews: number;
  dropRatio: number;
  lastSeenAt: number | null;
};

export type QuietReaderOptions = {
  /** Length of the "recent" and "prior" comparison windows, in days. */
  windowDays?: number;
  /** A person needs at least this many prior-window views to be scored at
   *  all — guards against reading noise (1 view 45 days ago, 0 since) as a
   *  100% drop. */
  minBaselineViews?: number;
  /** recentViews / priorViews at or below this ratio counts as "visibly
   *  dropped" (0.34 = down two-thirds or more). */
  dropThreshold?: number;
};

/**
 * Active-membership people whose analytics pageview count dropped sharply
 * vs. their own prior baseline — a read-only aggregation over data the
 * platform already has (analyticsEvents + memberships), not a new mechanic.
 * Ranked steepest-drop-first, ties broken by prior audience size (bigger
 * prior views = a bigger signal). See docs/architecture/... for why this
 * reads analyticsEvents, not personActivity: personActivity's "view" type
 * has no writers today, analyticsEvents is the real, personId-stamped
 * pageview data (see POST /api/track).
 */
export async function quietReaders(opts: QuietReaderOptions = {}): Promise<QuietReaderRow[]> {
  const windowDays = opts.windowDays ?? 30;
  const minBaselineViews = opts.minBaselineViews ?? 3;
  const dropThreshold = opts.dropThreshold ?? 0.34;

  const now = Date.now();
  const recentFrom = now - windowDays * DAY_MS;
  const priorFrom = now - windowDays * 2 * DAY_MS;
  const inRecent = sql`${analyticsEvents.at} >= ${recentFrom}`;
  const inPrior = sql`${analyticsEvents.at} >= ${priorFrom} and ${analyticsEvents.at} < ${recentFrom}`;

  const rows = await db
    .select({
      personId: memberships.personId,
      name: people.name,
      email: people.email,
      tier: memberships.tier,
      recentViews: sql<number>`sum(case when ${inRecent} and ${analyticsEvents.name} = 'pageview' then 1 else 0 end)`,
      priorViews: sql<number>`sum(case when ${inPrior} and ${analyticsEvents.name} = 'pageview' then 1 else 0 end)`,
      lastSeenAt: sql<number | null>`max(case when ${analyticsEvents.name} = 'pageview' then ${analyticsEvents.at} else null end)`,
    })
    .from(memberships)
    .innerJoin(people, eq(people.id, memberships.personId))
    .leftJoin(analyticsEvents, eq(analyticsEvents.personId, memberships.personId))
    .where(eq(memberships.status, "active"))
    .groupBy(memberships.personId, people.name, people.email, memberships.tier);

  return rows
    .map((r) => {
      const recentViews = Number(r.recentViews ?? 0);
      const priorViews = Number(r.priorViews ?? 0);
      return {
        personId: r.personId,
        name: r.name,
        email: r.email,
        tier: r.tier,
        recentViews,
        priorViews,
        dropRatio: priorViews > 0 ? recentViews / priorViews : recentViews === 0 ? 0 : Infinity,
        lastSeenAt: r.lastSeenAt ?? null,
      };
    })
    .filter((r) => r.priorViews >= minBaselineViews && r.dropRatio <= dropThreshold)
    .sort((a, b) => a.dropRatio - b.dropRatio || b.priorViews - a.priorViews);
}
