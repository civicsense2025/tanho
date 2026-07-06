import type { MetadataRoute } from "next";

/**
 * XML serialization for the sitemap subsystem. The sitemap is delivered by
 * plain Route Handlers (app/sitemap.xml + app/sitemap/[id]), NOT the Next
 * `sitemap.ts` metadata convention: that convention reserves /sitemap.xml but,
 * in this Next build, only serves the chunk children at /sitemap/[id].xml and
 * never an index there — leaving /sitemap.xml (where robots.txt points) dead.
 * Owning the route handlers gives us a real <sitemapindex> at /sitemap.xml.
 */

/** Escape the five XML predefined entities for use as element text. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Serialize a MetadataRoute.Sitemap (url + optional lastmod/changefreq/priority) to a <urlset>. */
export function renderUrlset(entries: MetadataRoute.Sitemap): string {
  const body = entries
    .map((e) => {
      const parts = [`    <loc>${escapeXml(String(e.url))}</loc>`];
      if (e.lastModified) {
        const iso = e.lastModified instanceof Date ? e.lastModified.toISOString() : String(e.lastModified);
        parts.push(`    <lastmod>${escapeXml(iso)}</lastmod>`);
      }
      if (e.changeFrequency) parts.push(`    <changefreq>${e.changeFrequency}</changefreq>`);
      if (typeof e.priority === "number") parts.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</urlset>\n`
  );
}

/** Serialize a list of child-sitemap locations to a <sitemapindex>. */
export function renderSitemapIndex(locs: string[]): string {
  const body = locs.map((loc) => `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n  </sitemap>`).join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</sitemapindex>\n`
  );
}

/** The response headers every sitemap route shares. */
export const SITEMAP_HEADERS = {
  "content-type": "application/xml",
  "cache-control": "public, max-age=0, must-revalidate",
} as const;
