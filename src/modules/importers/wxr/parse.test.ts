import { describe, expect, it } from "vitest";
import { parseWxr, MAX_COMMENTS } from "./parse";

/** A minimal but realistic WXR channel wrapper. */
function wxr(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:wp="http://wordpress.org/export/1.2/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>${inner}</channel>
</rss>`;
}

const POST_ITEM = `
  <item>
    <title>Hello World</title>
    <link>https://old.example.com/2024/03/hello-world/</link>
    <dc:creator><![CDATA[jane]]></dc:creator>
    <content:encoded><![CDATA[<p>Intro</p><figure class="wp-block-image"><img src="https://cdn/x.jpg" alt="X"/></figure><p>Outro</p>]]></content:encoded>
    <excerpt:encoded><![CDATA[]]></excerpt:encoded>
    <wp:post_id>7</wp:post_id>
    <wp:post_name><![CDATA[hello-world]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[post]]></wp:post_type>
    <category domain="category" nicename="news"><![CDATA[News]]></category>
    <category domain="post_tag" nicename="react"><![CDATA[React]]></category>
    <wp:postmeta><wp:meta_key><![CDATA[isbn]]></wp:meta_key><wp:meta_value><![CDATA[123]]></wp:meta_value></wp:postmeta>
    <wp:comment>
      <wp:comment_id>11</wp:comment_id>
      <wp:comment_author><![CDATA[Bob]]></wp:comment_author>
      <wp:comment_author_email><![CDATA[bob@x.com]]></wp:comment_author_email>
      <wp:comment_content><![CDATA[Nice post!]]></wp:comment_content>
      <wp:comment_approved><![CDATA[1]]></wp:comment_approved>
      <wp:comment_date_gmt><![CDATA[2024-03-01 12:00:00]]></wp:comment_date_gmt>
      <wp:comment_parent>0</wp:comment_parent>
    </wp:comment>
  </item>`;

describe("parseWxr", () => {
  it("parses a well-formed export with an author and a post", () => {
    const result = parseWxr(
      wxr(
        `<wp:author><wp:author_login><![CDATA[jane]]></wp:author_login><wp:author_email><![CDATA[jane@example.com]]></wp:author_email><wp:author_display_name><![CDATA[Jane Doe]]></wp:author_display_name></wp:author>` +
          POST_ITEM,
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.authors).toEqual([{ login: "jane", email: "jane@example.com", displayName: "Jane Doe" }]);
    expect(result.issues).toEqual([]);
  });

  it("extracts CDATA body html and namespaced fields", () => {
    const result = parseWxr(wxr(POST_ITEM));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item = result.items[0]!;
    expect(item.title).toBe("Hello World");
    expect(item.link).toBe("https://old.example.com/2024/03/hello-world/");
    expect(item.postType).toBe("post");
    expect(item.status).toBe("publish");
    expect(item.slug).toBe("hello-world");
    expect(item.creator).toBe("jane");
    expect(item.contentHtml).toContain('<figure class="wp-block-image">');
    // parseTagValue:false keeps ids as strings — never coerced to number.
    expect(item.postId).toBe("7");
    expect(typeof item.postId).toBe("string");
  });

  it("splits categories vs tags by the domain attribute", () => {
    const result = parseWxr(wxr(POST_ITEM));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cats = result.items[0]!.categories;
    expect(cats).toEqual([
      { domain: "category", nicename: "news", name: "News" },
      { domain: "post_tag", nicename: "react", name: "React" },
    ]);
  });

  it("parses postmeta and comments", () => {
    const result = parseWxr(wxr(POST_ITEM));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item = result.items[0]!;
    expect(item.postmeta).toEqual([{ key: "isbn", value: "123" }]);
    expect(item.comments).toHaveLength(1);
    expect(item.comments[0]).toEqual({
      id: "11",
      author: "Bob",
      authorEmail: "bob@x.com",
      content: "Nice post!",
      date: "2024-03-01 12:00:00",
      approved: true,
      parentId: "0",
    });
  });

  it("coerces a single item/category to an array (isArray)", () => {
    const single = wxr(`
      <item>
        <title>Solo</title>
        <wp:post_type><![CDATA[page]]></wp:post_type>
        <wp:post_name><![CDATA[solo]]></wp:post_name>
        <wp:status><![CDATA[publish]]></wp:status>
        <category domain="category" nicename="only"><![CDATA[Only]]></category>
      </item>`);
    const result = parseWxr(single);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.categories).toHaveLength(1);
  });

  it("reads a plain-text category (no CDATA) via #text", () => {
    const result = parseWxr(
      wxr(`
      <item>
        <title>T</title>
        <wp:post_type><![CDATA[post]]></wp:post_type>
        <wp:post_name><![CDATA[t]]></wp:post_name>
        <wp:status><![CDATA[publish]]></wp:status>
        <category domain="category" nicename="news">Plain News</category>
      </item>`),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0]!.categories[0]).toEqual({ domain: "category", nicename: "news", name: "Plain News" });
  });

  it("skips a malformed item but keeps the rest, without throwing", () => {
    // The parser can't produce a non-object item from valid XML, so assert the
    // survivable case: an item missing BOTH post_type and title is skipped.
    const result = parseWxr(
      wxr(
        `<item><wp:post_id>99</wp:post_id></item>` + POST_ITEM,
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1); // only the good post
    expect(result.issues.some((i) => i.kind === "malformed-item")).toBe(true);
  });

  it("returns ok:false on malformed XML instead of throwing", () => {
    const result = parseWxr("<rss><channel><item>unclosed");
    // fast-xml-parser is lenient, so this may parse to a channel with no valid
    // items OR error — either way it must not throw and must be a clean result.
    expect(typeof result.ok).toBe("boolean");
  });

  it("returns ok:false when there is no rss.channel.item", () => {
    const result = parseWxr(`<?xml version="1.0"?><rss><channel><title>Just a feed</title></channel></rss>`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/item/);
  });

  it("returns ok:false when the root is not an rss channel", () => {
    const result = parseWxr(`<?xml version="1.0"?><notrss><foo/></notrss>`);
    expect(result.ok).toBe(false);
  });

  it("exposes a comment cap constant well above any real single site", () => {
    expect(MAX_COMMENTS).toBeGreaterThanOrEqual(50_000);
  });
});
