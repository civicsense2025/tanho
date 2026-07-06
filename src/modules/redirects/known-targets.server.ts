import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pages } from "@/modules/pages/schema";
import { entries } from "@/modules/entries/schema";
import { entryPublicPath } from "@/modules/entries/paths";
import { listPublishedTypes, listPublishedTypeRows } from "@/modules/content-schema/queries";
import { listRedirects } from "./queries";

/**
 * SERVER-ONLY. Enumerate the site's real, published destination paths — the
 * `knownTargets` the bulk-mapping heuristic matches old URLs against and the
 * safety report treats as valid landing pages. Mirrors the route sources the
 * sitemap already enumerates (published pages + entries + table-backed custom
 * types) so the two never drift, and adds existing redirect targets so an old
 * URL can legitimately map onto an already-redirected path.
 *
 * Read UNCACHED (this runs inside an owner-gated server action, which is
 * dynamic) and returns site-relative paths only.
 */
export async function enumerateKnownTargets(): Promise<string[]> {
  const targets = new Set<string>();

  // Published pages (their canonical route).
  const pageRows = await db
    .select({ route: pages.route })
    .from(pages)
    .where(eq(pages.status, "published"));
  for (const p of pageRows) if (p.route) targets.add(p.route);

  // Published entries (project/guide/hub) via the shared path builder.
  const entryRows = await db
    .select({ type: entries.type, slug: entries.slug, data: entries.data })
    .from(entries)
    .where(eq(entries.status, "published"));
  for (const e of entryRows) {
    const path = entryPublicPath(e.type, e.slug, e.data ?? {});
    if (path) targets.add(path);
  }

  // Table-backed custom types: their index path + one path per published row.
  const publishedTypes = await listPublishedTypes();
  for (const type of publishedTypes) {
    if (type.basePath) targets.add(type.basePath);
    const slugField = type.slugField ?? "slug";
    const rows = await listPublishedTypeRows(type);
    for (const row of rows) {
      const slug = String(row[slugField] ?? "");
      if (slug) targets.add(`${type.basePath}/${slug}`);
    }
  }

  // Existing redirect destinations are valid landing spots too.
  const existing = await listRedirects();
  for (const r of existing) {
    const dest = r.destination || r.toPath;
    if (dest) targets.add(dest);
  }

  return [...targets];
}
