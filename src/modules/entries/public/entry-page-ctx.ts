import { get as getBuiltinEntitySchema } from "@/entities/registry";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getSeoSettings } from "@/modules/seo/queries";
import type { PageCtx } from "@/blocks/types";
import type { EntryRow } from "../schema";

/**
 * Breadcrumb page-context for an entry detail view — the entity-route twin of
 * what the page route builds from `getPageAncestors`. The trail is derived
 * from the entity registry (index label = schema.plural, index route =
 * schema.basePath), with optional extra crumbs between index and entry (e.g.
 * a guide's hub). Callers fetch this only when the entry's block tree actually
 * contains a breadcrumbs block; both settings reads are cached.
 */
export async function entryPageCtx(
  type: string,
  entry: EntryRow,
  extraCrumbs: Array<{ title: string; route: string }> = [],
): Promise<PageCtx | undefined> {
  const schema = getBuiltinEntitySchema(type);
  if (!schema) return undefined;
  const base = schema.basePath.replace(/\/$/, "");
  const [general, seo] = await Promise.all([getGeneralSettings(), getSeoSettings()]);
  const lastCrumbRoute = extraCrumbs[extraCrumbs.length - 1]?.route ?? base;
  return {
    title: entry.title,
    route: `${lastCrumbRoute}/${entry.slug}`,
    ancestors: [{ title: schema.plural, route: base }, ...extraCrumbs],
    siteName: general.name,
    siteUrl: seo.siteUrl || process.env.APP_URL || "http://localhost:3000",
  };
}
