import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pages } from "@/modules/pages/schema";
import { entries } from "@/modules/entries/schema";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getSeoSettings } from "@/modules/seo/queries";
import { getCanonicalSiteUrl } from "@/modules/domain/queries";
import { getContentTypesSettings, isTypeDisabled } from "@/modules/custom-types/content-types-settings";
import { listPublishedTypes, type TableBackedType } from "@/modules/content-schema/queries";
import { countPublishedRows, listPublishedRowsForSitemap } from "@/modules/content-schema/crud";
import { entryPublicPath } from "@/modules/entries/paths";

/**
 * A sitemap-index built from the live content registry: one "core" section
 * (pages + entries + /resources + every published type's index URL) plus one
 * or more "type" sections per table-backed content type, each holding up to
 * SITEMAP_CHUNK_SIZE row URLs. The route handlers app/sitemap/[id]/route.ts
 * (each section) and app/sitemap.xml/route.ts (the index) both read this same
 * section list, so the index and the children never disagree. This module is
 * the single source of what those ids mean.
 */

/** Google caps a single sitemap at 50,000 URLs; large types are chunked. */
export const SITEMAP_CHUNK_SIZE = 50_000;

const BASE_FALLBACK = process.env.APP_URL ?? "http://localhost:3000";

/**
 * One entry in the sitemap index. `id` is the stable route id Next serves at
 * `/sitemap/[id].xml`. id 0 is always the "core" section; "type" sections
 * follow in a deterministic order (types sorted by slug, then by chunk).
 */
export type SitemapSectionDescriptor = {
  id: number;
  kind: "core" | "type";
  typeSlug?: string;
  chunk?: number;
};

/** The canonical, trailing-slash-stripped site base (shared by both sitemap routes). */
async function resolveBase(): Promise<string> {
  const seo = await getSeoSettings();
  return (await getCanonicalSiteUrl(seo.siteUrl, BASE_FALLBACK)).replace(/\/$/, "");
}

/** Whether the site is advertised to crawlers at all. */
async function isIndexable(): Promise<boolean> {
  const general = await getGeneralSettings();
  return general.indexable;
}

/**
 * The sitemap index: id 0 (core) plus consecutive type sections. When the site
 * is non-indexable, only the (empty-when-built) core section exists so nothing
 * is advertised. Types are sorted by slug for stable ids, and each is split
 * into `ceil(count / chunkSize)` (at least one) consecutive chunk sections.
 */
export async function listSitemapSections(
  chunkSize = SITEMAP_CHUNK_SIZE,
): Promise<SitemapSectionDescriptor[]> {
  const sections: SitemapSectionDescriptor[] = [{ id: 0, kind: "core" }];
  if (!(await isIndexable())) return sections;

  const contentTypes = await getContentTypesSettings();
  const types = (await listPublishedTypes())
    .filter((type) => !isTypeDisabled(contentTypes, `custom:${type.slug}`))
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  let id = 1;
  for (const type of types) {
    const count = await countPublishedRows(type.tableName);
    const chunks = Math.max(1, Math.ceil(count / chunkSize));
    for (let chunk = 0; chunk < chunks; chunk++) {
      sections.push({ id: id++, kind: "type", typeSlug: type.slug, chunk });
    }
  }
  return sections;
}

/** The core section: pages + entries + /resources + every published type's index URL. */
async function buildCoreSection(base: string): Promise<MetadataRoute.Sitemap> {
  const contentTypes = await getContentTypesSettings();
  const abs = (path: string) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const pageRows = await db
    .select({ route: pages.route, noIndex: pages.noIndex, updatedAt: pages.updatedAt })
    .from(pages)
    .where(eq(pages.status, "published"));

  // The home page ranks highest and changes most; interior pages default lower.
  // priority is relative-within-site only (search engines treat it as a hint).
  const items: MetadataRoute.Sitemap = pageRows
    .filter((p) => !p.noIndex)
    .map((p) => ({
      url: abs(p.route),
      lastModified: new Date(p.updatedAt),
      changeFrequency: p.route === "/" ? ("daily" as const) : ("weekly" as const),
      priority: p.route === "/" ? 1 : 0.8,
    }));

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
    const path = entryPublicPath(e.type, e.slug, e.data ?? {});
    if (path) {
      items.push({
        url: abs(path),
        lastModified: new Date(e.updatedAt),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  if (!isTypeDisabled(contentTypes, "resource")) {
    items.push({ url: abs("/resources"), lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 });
  }

  // Table-backed custom content types: their index page lives in the core
  // section (so index URLs persist even when a type's rows chunk into other
  // ids); the per-row URLs are emitted by the type sections. Same indexable
  // gate as everything else (already short-circuited when the site is private).
  const publishedTypes = await listPublishedTypes();
  for (const type of publishedTypes) {
    if (isTypeDisabled(contentTypes, `custom:${type.slug}`)) continue;
    items.push({
      url: abs(type.basePath),
      lastModified: new Date(type.updatedAt),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }
  return items;
}

/** One chunk of a type's published rows, as sitemap entries. */
async function buildTypeSection(
  descriptor: SitemapSectionDescriptor,
  base: string,
  chunkSize: number,
): Promise<MetadataRoute.Sitemap> {
  const contentTypes = await getContentTypesSettings();
  const type = (await listPublishedTypes()).find(
    (t): t is TableBackedType => t.slug === descriptor.typeSlug,
  );
  if (!type || isTypeDisabled(contentTypes, `custom:${type.slug}`)) return [];

  const chunk = descriptor.chunk ?? 0;
  const rows = await listPublishedRowsForSitemap(type.tableName, {
    limit: chunkSize,
    offset: chunk * chunkSize,
  });

  const items: MetadataRoute.Sitemap = [];
  for (const row of rows) {
    // Prefer the materialized full path; only fall back to base/slug if empty.
    const slug = String(row.path || "").split("/").filter(Boolean).pop() ?? "";
    const path = row.path || `${type.basePath}/${slug}`;
    items.push({
      url: `${base}${path.startsWith("/") ? path : `/${path}`}`,
      lastModified: new Date(Number(row.updated_at) || Date.now()),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }
  return items;
}

/**
 * The URLs for one index section. `core` replicates the pages/entries/resources
 * logic of the classic single-file sitemap plus every type's index URL; `type`
 * pages one chunk of a content type's published rows. Returns [] when the site
 * is non-indexable or the descriptor is unknown.
 */
export async function buildSitemapForSection(
  descriptor: SitemapSectionDescriptor,
  base: string,
  chunkSize = SITEMAP_CHUNK_SIZE,
): Promise<MetadataRoute.Sitemap> {
  if (!(await isIndexable())) return [];
  if (descriptor.kind === "core") return buildCoreSection(base);
  return buildTypeSection(descriptor, base, chunkSize);
}

/** The canonical base URL, computed once per request (used by both sitemap route handlers). */
export { resolveBase as getSitemapBase };
