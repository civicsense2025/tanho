import { listContentEntries, getContentTypeBySlug } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { renderRichText } from "@/lib/richtext/renderRichText";

export const dynamic = "force-dynamic";

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET() {
  const settings = await getSettings();
  if (!settings.features.newsletter) {
    return new Response("Not found", { status: 404 });
  }

  const postType = await getContentTypeBySlug("post");
  const posts = postType ? await listContentEntries({ contentTypeId: postType.id, publishedOnly: true }) : [];

  const items = posts.map((p) => {
    const data = parseData(p.data);
    const link = `${SITE_URL}/posts/${p.slug}`;
    const pubDate = p.publishedAt ? new Date(p.publishedAt).toUTCString() : new Date(p.createdAt).toUTCString();
    const isPaid = data.visibility === "paid";
    const bodyHtml = isPaid ? "" : renderRichText(String(data.body || ""));
    const description = data.excerpt ? String(data.excerpt) : "";
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
  });

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
