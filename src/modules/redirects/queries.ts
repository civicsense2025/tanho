import { cacheLife, cacheTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { redirects } from "./schema";

export type RedirectRow = typeof redirects.$inferSelect;

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
