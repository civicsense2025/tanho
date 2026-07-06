import { cacheLife, cacheTag } from "next/cache";
import { asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { redirects } from "./schema";

export type RedirectRow = typeof redirects.$inferSelect;

/** A migration/import batch: a set of redirects sharing a `sourceBatch` id. */
export type RedirectBatch = {
  batch: string;
  count: number;
  /** Newest createdAt in the batch (epoch ms) — for display ordering. */
  latest: number;
};

/**
 * Look up a redirect by its source path. Cached on the "redirects" tag so a
 * new redirect appears on the next request. Returns null when none matches —
 * the catch-all router then falls through to page/entity resolution.
 */
export async function getRedirect(fromPath: string): Promise<RedirectRow | null> {
  "use cache";
  cacheLife("max");
  cacheTag("redirects");
  const row = await db.query.redirects.findFirst({
    where: eq(redirects.fromPath, fromPath),
  });
  return row ?? null;
}

/** Admin list — uncached (admin is dynamic). */
export async function listRedirects(): Promise<RedirectRow[]> {
  return db.query.redirects.findMany({ orderBy: [asc(redirects.fromPath)] });
}

/**
 * Migration/import batches — redirects grouped by `sourceBatch` (set by the bulk
 * mapper and the import pipeline). Powers the "roll back a whole batch" control
 * in the SEO hub. Uncached (admin). Ordered newest-first.
 */
export async function listRedirectBatches(): Promise<RedirectBatch[]> {
  const rows = await db
    .select({
      batch: redirects.sourceBatch,
      count: sql<number>`count(*)`,
      latest: sql<number>`max(${redirects.createdAt})`,
    })
    .from(redirects)
    .where(isNotNull(redirects.sourceBatch))
    .groupBy(redirects.sourceBatch)
    .orderBy(desc(sql`max(${redirects.createdAt})`));
  // sourceBatch is non-null here (filtered above); normalize the type.
  return rows
    .filter((r): r is { batch: string; count: number; latest: number } => Boolean(r.batch))
    .map((r) => ({ batch: r.batch, count: Number(r.count), latest: Number(r.latest) }));
}
