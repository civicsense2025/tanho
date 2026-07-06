import {
  listSitemapSections,
  buildSitemapForSection,
  getSitemapBase,
} from "@/modules/seo/technical/sitemap-sources";
import { renderUrlset, SITEMAP_HEADERS } from "@/modules/seo/technical/sitemap-xml";

/**
 * A child sitemap at /sitemap/{id}.xml (linked from the index at /sitemap.xml).
 * `id` arrives with the .xml suffix (e.g. "0.xml") because the route matches the
 * literal path; strip it to recover the numeric section id. Unknown ids 404.
 * The section list is the SAME one the index uses (listSitemapSections), so the
 * two never disagree about what each id contains.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  const sid = Number(id.replace(/\.xml$/, ""));
  if (!Number.isInteger(sid) || sid < 0) {
    return new Response("Not found", { status: 404 });
  }

  const sections = await listSitemapSections();
  const descriptor = sections.find((s) => s.id === sid);
  if (!descriptor) return new Response("Not found", { status: 404 });

  const base = await getSitemapBase();
  const entries = await buildSitemapForSection(descriptor, base);
  return new Response(renderUrlset(entries), { headers: SITEMAP_HEADERS });
}
