import { listSitemapSections, getSitemapBase } from "@/modules/seo/technical/sitemap-sources";
import { renderSitemapIndex, SITEMAP_HEADERS } from "@/modules/seo/technical/sitemap-xml";

/**
 * The sitemap INDEX at /sitemap.xml — the single entry point robots.txt
 * advertises. Lists one child per registry section (see sitemap-sources.ts).
 * A plain Route Handler rather than the `sitemap.ts` metadata convention,
 * because that convention reserves /sitemap.xml without serving an index there
 * in this Next build (see sitemap-xml.ts header).
 */
export async function GET(): Promise<Response> {
  const [sections, base] = await Promise.all([listSitemapSections(), getSitemapBase()]);
  const locs = sections.map((s) => `${base}/sitemap/${s.id}.xml`);
  return new Response(renderSitemapIndex(locs), { headers: SITEMAP_HEADERS });
}
