/**
 * XML serialization for the sitemap subsystem. The sitemap is delivered by
 * plain Route Handlers (app/sitemap.xml + app/sitemap/[id]), NOT the Next
 * `sitemap.ts` metadata convention: that convention reserves /sitemap.xml but,
 * in this Next build, only serves the chunk children at /sitemap/[id].xml and
 * never an index there — leaving /sitemap.xml (where robots.txt points) dead.
 * Owning the route handlers gives us a real <sitemapindex> at /sitemap.xml.
 */

/** One image referenced by a sitemap URL (Google image sitemap extension). */
export type SitemapImage = {
  loc: string;
  title?: string;
  caption?: string;
};

/** A sitemap entry that carries image metadata alongside the standard sitemap fields. */
export type SitemapEntry = {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  images?: SitemapImage[];
};

/** Escape the five XML predefined entities for use as element text. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Strip characters that are illegal in XML 1.0 text content. Valid XML allows
 * U+0009, U+000A, U+000D, U+0020–U+D7FF, U+E000–U+FFFD, and U+10000–U+10FFFF.
 * This is a defensive last line of defense for text that comes from the DB.
 */
export function stripInvalidXmlChars(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uD800-\uDFFF\uFFFE\uFFFF]/g, "");
}

/** Render an <image:image> block for one image entry. */
function renderImageBlock(image: SitemapImage): string {
  const parts = [`      <image:loc>${escapeXml(stripInvalidXmlChars(image.loc))}</image:loc>`];
  if (image.title) parts.push(`      <image:title>${escapeXml(stripInvalidXmlChars(image.title))}</image:title>`);
  if (image.caption) parts.push(`      <image:caption>${escapeXml(stripInvalidXmlChars(image.caption))}</image:caption>`);
  return `    <image:image>\n${parts.join("\n")}\n    </image:image>`;
}

/** Serialize sitemap entries to a <urlset> with optional image sitemap tags. */
export function renderUrlset(entries: SitemapEntry[]): string {
  const body = entries
    .map((e) => {
      const parts = [`    <loc>${escapeXml(stripInvalidXmlChars(String(e.url)))}</loc>`];
      if (e.lastModified) {
        const iso = e.lastModified instanceof Date ? e.lastModified.toISOString() : String(e.lastModified);
        parts.push(`    <lastmod>${escapeXml(stripInvalidXmlChars(iso))}</lastmod>`);
      }
      if (e.changeFrequency) parts.push(`    <changefreq>${e.changeFrequency}</changefreq>`);
      if (typeof e.priority === "number") parts.push(`    <priority>${e.priority}</priority>`);
      if (e.images) {
        for (const image of e.images) {
          parts.push(renderImageBlock(image));
        }
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
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
