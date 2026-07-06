import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { redirects } from "@/modules/redirects/schema";
import { isSameOriginPath } from "@/modules/redirects/validation";
import { slugHistory } from "../schema";

/** What kind of record changed path — recorded on the slugHistory row. */
export type SlugEntityType = "page" | "entry" | "content-row";

/**
 * Record a public-path rename: create a permanent (301) redirect from the old
 * path to the new one and log the change to slug_history. Called from WITHIN an
 * already-authenticated update action (page/entry/content-row), so it does not
 * re-check auth. A no-op when the path didn't actually change or either path is
 * not a safe same-origin path.
 *
 * Idempotent + loop-safe:
 * - skips when old === new,
 * - never creates a self-referential redirect,
 * - repoints any EXISTING redirects that pointed at the old path to the new one
 *   (so a rename chain A→B→C collapses to A→C, B→C — no multi-hop),
 * - upserts the old→new rule (updates it if one already existed for old).
 *
 * Does NOT call updateTag: the caller's own cache invalidation for the entity
 * covers the page; the redirect table is read uncached in the catch-all router.
 * Returns true if a redirect was written.
 */
export async function recordSlugChange(
  entityType: SlugEntityType,
  entityId: string,
  oldPath: string,
  newPath: string,
): Promise<boolean> {
  if (!oldPath || !newPath || oldPath === newPath) return false;
  if (!isSameOriginPath(oldPath) || !isSameOriginPath(newPath)) return false;

  // NEVER let a rename's redirect bookkeeping surface as a 500. The caller
  // (savePageDetails / updateEntry / updateRowData) has already committed the
  // entity's new slug before calling us; a concurrent rename of the same old
  // path can race the unique `redirects.fromPath` constraint. Swallow + log so
  // the rename still succeeds — a missing redirect is a soft SEO loss, not a
  // request failure. (Steps are individually idempotent, so a partial run on
  // error re-converges on the next rename.)
  try {
    // Collapse chains: anything that used to redirect TO the old path should now
    // point at the new path, so we never build A→B→C.
    await db
      .update(redirects)
      .set({ toPath: newPath })
      .where(eq(redirects.toPath, oldPath));

    // Upsert the old→new rule via ON CONFLICT (fromPath is UNIQUE) — no
    // find-then-insert race window.
    await db
      .insert(redirects)
      .values({ fromPath: oldPath, toPath: newPath, code: 301 })
      .onConflictDoUpdate({
        target: redirects.fromPath,
        set: { toPath: newPath, code: 301 },
      });

    // Loop guard: drop any rule that is now self-referential (from === to),
    // which can arise if the new path previously redirected back to the old one.
    // The catch-all also re-checks same-origin at redirect time (defence in
    // depth).
    await db.delete(redirects).where(sql`${redirects.fromPath} = ${redirects.toPath}`);

    await db.insert(slugHistory).values({ entityType, entityId, oldPath, newPath });
    return true;
  } catch (err) {
    console.error("[seo] recordSlugChange failed", { entityType, entityId, oldPath, newPath, err });
    return false;
  }
}
