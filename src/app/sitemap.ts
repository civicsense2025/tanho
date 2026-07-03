import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pages } from "@/modules/pages/schema";
import { entries } from "@/modules/entries/schema";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getSeoSettings } from "@/modules/seo/queries";
import { getContentTypesSettings, isTypeDisabled } from "@/modules/custom-types/content-types-settings";

const BASE_FALLBACK = process.env.APP_URL ?? "http://localhost:3000";

/** Map a published entry to its public path, or null if the type has none. */
function entryPath(type: string, slug: string, data: Record<string, unknown>): string | null {
  switch (type) {
    case "project":
      return `/work/${slug}`;
    case "guide": {
      const category = typeof data.category === "string" ? data.category : "general";
      return `/guides/${category}/${slug}`;
    }
    case "hub":
      return `/guides/${slug}`;
    default:
      return null;
  }
}

/**
 * DB-driven sitemap: published, indexable pages plus published entries.
 * Returns an empty sitemap when the site is set non-indexable so nothing
 * is advertised to crawlers.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [general, seo, contentTypes] = await Promise.all([
    getGeneralSettings(),
    getSeoSettings(),
    getContentTypesSettings(),
  ]);
  if (!general.indexable) return [];

  const base = (seo.siteUrl || BASE_FALLBACK).replace(/\/$/, "");
  const abs = (path: string) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const pageRows = await db
    .select({ route: pages.route, noIndex: pages.noIndex, updatedAt: pages.updatedAt })
    .from(pages)
    .where(eq(pages.status, "published"));

  const items: MetadataRoute.Sitemap = pageRows
    .filter((p) => !p.noIndex)
    .map((p) => ({ url: abs(p.route), lastModified: new Date(p.updatedAt) }));

  const entryRows = await db
    .select({
      type: entries.type,
      slug: entries.slug,
      data: entries.data,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .where(eq(entries.status, "published"));

  for (const e of entryRows) {
    // A content type turned off in Settings → Content types is excluded from
    // the sitemap (and from routing — see the entity route resolver).
    if (isTypeDisabled(contentTypes, e.type)) continue;
    const path = entryPath(e.type, e.slug, e.data ?? {});
    if (path) items.push({ url: abs(path), lastModified: new Date(e.updatedAt) });
  }

  if (!isTypeDisabled(contentTypes, "resource")) {
    items.push({ url: abs("/resources"), lastModified: new Date() });
  }
  return items;
}
