import { listPosts } from "@/lib/db";
import { renderPostBody } from "@/lib/content/post-content";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Escapes text for safe inclusion in XML character data / attributes. */
function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 feed of published posts. PAID posts emit title + excerpt only — never the body — so
 * the feed can't be used to bypass the paywall. Public posts include the full rendered, sanitized
 * HTML body in a CDATA <content:encoded>. When newsletter is off, returns 404. */
export async function GET() {
  const settings = await getSettings();
  if (!settings.features.newsletter) {
    return new Response("Not found", { status: 404 });
  }

  const posts = await listPosts(true);

  const items = await Promise.all(
    posts.map(async (p) => {
      const link = `${SITE_URL}/posts/${p.slug}`;
      const pubDate = p.publishedAt ? new Date(p.publishedAt).toUTCString() : new Date(p.createdAt).toUTCString();
      const isPaid = p.visibility === "paid";
      const bodyHtml = isPaid ? "" : await renderPostBody(p.slug);
      const description = p.excerpt ?? "";
      const contentBlock = bodyHtml
        ? `\n      <content:encoded><![CDATA[${bodyHtml}]]></content:encoded>`
        : "";
      return `    <item>
      <title>${xml(p.title)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="true">${xml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${xml(description)}</description>${contentBlock}
    </item>`;
    })
  );

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xml(settings.siteName)}</title>
    <link>${xml(SITE_URL)}</link>
    <description>${xml(settings.description)}</description>
    <language>${xml(settings.locale)}</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${xml(`${SITE_URL}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items.join("\n")}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
