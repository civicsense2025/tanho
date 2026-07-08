import { describe, expect, it } from "vitest";
import { escapeXml, renderUrlset, renderSitemapIndex, stripInvalidXmlChars } from "./sitemap-xml";

describe("escapeXml", () => {
  it("escapes the five predefined entities", () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f");
  });
  it("escapes an ampersand in a query string (the common real case)", () => {
    expect(escapeXml("https://x/y?a=1&b=2")).toBe("https://x/y?a=1&amp;b=2");
  });
});

describe("stripInvalidXmlChars", () => {
  it("removes control characters while preserving tabs, newlines, and printable text", () => {
    expect(stripInvalidXmlChars("hello\x00\x01\t\nworld\x7F")).toBe("hello\t\nworld\x7F");
  });
  it("removes surrogate halves and forbidden end-of-plane characters", () => {
    expect(stripInvalidXmlChars("a\uD800b\uDFFFc\uFFFE\uFFFFd")).toBe("abcd");
  });
  it("strips illegal chars from rendered sitemap output", () => {
    const xml = renderUrlset([{ url: "https://x/\x00bad", lastModified: "\x01bad" }]);
    expect(xml).toContain("<loc>https://x/bad</loc>");
    expect(xml).toContain("<lastmod>bad</lastmod>");
  });
});

describe("renderUrlset", () => {
  it("emits loc + optional lastmod/changefreq/priority", () => {
    const xml = renderUrlset([
      {
        url: "https://x/a",
        lastModified: new Date("2026-01-02T03:04:05.000Z"),
        changeFrequency: "weekly",
        priority: 0.7,
      },
    ]);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>https://x/a</loc>");
    expect(xml).toContain("<lastmod>2026-01-02T03:04:05.000Z</lastmod>");
    expect(xml).toContain("<changefreq>weekly</changefreq>");
    expect(xml).toContain("<priority>0.7</priority>");
  });
  it("omits optional fields when absent", () => {
    const xml = renderUrlset([{ url: "https://x/b" }]);
    expect(xml).toContain("<loc>https://x/b</loc>");
    expect(xml).not.toContain("<lastmod>");
    expect(xml).not.toContain("<changefreq>");
    expect(xml).not.toContain("<priority>");
  });
  it("escapes an ampersand in a url", () => {
    const xml = renderUrlset([{ url: "https://x/c?a=1&b=2" }]);
    expect(xml).toContain("<loc>https://x/c?a=1&amp;b=2</loc>");
  });
  it("accepts a string lastModified", () => {
    const xml = renderUrlset([{ url: "https://x/d", lastModified: "2026-05-06" }]);
    expect(xml).toContain("<lastmod>2026-05-06</lastmod>");
  });

  it("emits image sitemap tags and namespace when images are provided", () => {
    const xml = renderUrlset([
      {
        url: "https://x/product",
        images: [
          { loc: "https://cdn.test/a.jpg", title: "A", caption: "First" },
          { loc: "https://cdn.test/b.jpg", title: "B", caption: "Second" },
        ],
      },
    ]);
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(xml).toContain("<image:loc>https://cdn.test/a.jpg</image:loc>");
    expect(xml).toContain("<image:title>A</image:title>");
    expect(xml).toContain("<image:caption>First</image:caption>");
    expect(xml).toContain("<image:loc>https://cdn.test/b.jpg</image:loc>");
  });

  it("escapes image loc/title/caption", () => {
    const xml = renderUrlset([
      {
        url: "https://x/product",
        images: [{ loc: "https://cdn.test/x&amp;y.jpg", title: "A & B" }],
      },
    ]);
    expect(xml).toContain("<image:loc>https://cdn.test/x&amp;amp;y.jpg</image:loc>");
    expect(xml).toContain("<image:title>A &amp; B</image:title>");
  });
});

describe("renderSitemapIndex", () => {
  it("lists each child location", () => {
    const xml = renderSitemapIndex(["https://x/sitemap/0.xml", "https://x/sitemap/1.xml"]);
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("<loc>https://x/sitemap/0.xml</loc>");
    expect(xml).toContain("<loc>https://x/sitemap/1.xml</loc>");
  });
});
