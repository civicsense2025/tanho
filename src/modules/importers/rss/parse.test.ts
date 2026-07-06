import { describe, expect, it } from "vitest";
import { parseFeed } from "./parse";

/** A realistic RSS 2.0 feed: two items, one with content:encoded (full body)
 *  and a figure/img, one with only a <description>. */
const RSS_2 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Example Blog</title>
    <link>https://example.com</link>
    <description>An example feed</description>
    <item>
      <title>Hello World</title>
      <link>https://example.com/2024/03/hello-world/</link>
      <guid isPermaLink="false">tag:example.com,2024:hello</guid>
      <pubDate>Mon, 04 Mar 2024 12:00:00 GMT</pubDate>
      <content:encoded><![CDATA[<p>Intro</p><figure><img src="https://cdn.example.com/x.jpg" alt="X"/><figcaption>Cap</figcaption></figure><p>Outro</p>]]></content:encoded>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://example.com/second/</link>
      <guid>https://example.com/second/</guid>
      <description><![CDATA[<p>Just a description body.</p>]]></description>
    </item>
  </channel>
</rss>`;

/** A realistic Atom feed: two entries, one with <content>, one with <summary>;
 *  multiple <link> elements per entry (self + alternate). */
const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom</title>
  <link rel="self" href="https://example.com/atom.xml"/>
  <entry>
    <title>Atom One</title>
    <link rel="alternate" href="https://example.com/atom-one/"/>
    <link rel="edit" href="https://example.com/edit/atom-one/"/>
    <id>urn:uuid:1111</id>
    <updated>2024-03-04T12:00:00Z</updated>
    <content type="html"><![CDATA[<p>Atom one body</p>]]></content>
  </entry>
  <entry>
    <title>Atom Two</title>
    <link rel="alternate" href="https://example.com/atom-two/"/>
    <id>urn:uuid:2222</id>
    <published>2024-03-05T12:00:00Z</published>
    <summary type="html"><![CDATA[<p>Atom two summary</p>]]></summary>
  </entry>
</feed>`;

describe("parseFeed — RSS 2.0", () => {
  it("extracts items with title, content, link, and slug", () => {
    const result = parseFeed(RSS_2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data!.items).toHaveLength(2);

    const first = result.data!.items[0]!;
    expect(first.title).toBe("Hello World");
    expect(first.link).toBe("https://example.com/2024/03/hello-world/");
    expect(first.contentHtml).toContain("<figure>");
    expect(first.contentHtml).toContain("cdn.example.com/x.jpg");
    // slug derives from the last path segment of the link.
    expect(first.slug).toBe("hello-world");

    // Second item's body comes from <description> (no content:encoded).
    const second = result.data!.items[1]!;
    expect(second.title).toBe("Second Post");
    expect(second.contentHtml).toBe("<p>Just a description body.</p>");
    expect(second.slug).toBe("second");
  });
});

describe("parseFeed — Atom", () => {
  it("extracts entries with title, content|summary, alternate link, and slug", () => {
    const result = parseFeed(ATOM);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data!.items).toHaveLength(2);

    const first = result.data!.items[0]!;
    expect(first.title).toBe("Atom One");
    // The rel="alternate" href is the permalink, not rel="edit"/rel="self".
    expect(first.link).toBe("https://example.com/atom-one/");
    expect(first.contentHtml).toBe("<p>Atom one body</p>");
    expect(first.guid).toBe("urn:uuid:1111");
    expect(first.slug).toBe("atom-one");

    // Second entry's body comes from <summary> (no <content>).
    const second = result.data!.items[1]!;
    expect(second.title).toBe("Atom Two");
    expect(second.contentHtml).toBe("<p>Atom two summary</p>");
    expect(second.slug).toBe("atom-two");
  });
});

describe("parseFeed — malformed", () => {
  it("returns ok:false for a non-feed document, never throws", () => {
    const result = parseFeed("<html><body>not a feed</body></html>");
    expect(result.ok).toBe(false);
  });

  it("returns ok:false when there is no rss or feed root", () => {
    const result = parseFeed("<foo><bar/></foo>");
    expect(result.ok).toBe(false);
  });

  it("skips a content-less item as an issue rather than failing", () => {
    const feed = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Good</title><link>https://example.com/good/</link><description>body</description></item>
      <item></item>
    </channel></rss>`;
    const result = parseFeed(feed);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data!.items).toHaveLength(1);
    expect(result.data!.issues.some((i) => i.kind === "malformed-item")).toBe(true);
  });
});
