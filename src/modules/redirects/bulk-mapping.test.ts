import { describe, expect, it } from "vitest";
import {
  parsePastedList,
  parseCsv,
  parseSitemapXml,
  proposeMappings,
  sortForReview,
} from "./bulk-mapping";

describe("parsePastedList", () => {
  it("parses comma, arrow, ascii-arrow and tab separators", () => {
    const rows = parsePastedList(
      ["/a,/x", "/b → /y", "/c -> /z", "/d\t/w"].join("\n"),
    );
    expect(rows).toEqual([
      { from: "/a", to: "/x" },
      { from: "/b", to: "/y" },
      { from: "/c", to: "/z" },
      { from: "/d", to: "/w" },
    ]);
  });

  it("accepts a bare from with no target", () => {
    expect(parsePastedList("/orphan")).toEqual([{ from: "/orphan" }]);
  });

  it("ignores blank lines and # comments, trims whitespace", () => {
    const rows = parsePastedList("  \n# a comment\n  /a , /x  \n\n");
    expect(rows).toEqual([{ from: "/a", to: "/x" }]);
  });

  it("splits only on the first separator (query commas preserved)", () => {
    // arrow wins; the target keeps its query intact
    expect(parsePastedList("/a → /y?x=1,2")).toEqual([{ from: "/a", to: "/y?x=1,2" }]);
  });

  it("returns [] for empty input", () => {
    expect(parsePastedList("")).toEqual([]);
  });
});

describe("parseCsv", () => {
  it("drops a recognized header row", () => {
    const rows = parseCsv("from,to\n/a,/x\n/b,/y");
    expect(rows).toEqual([
      { from: "/a", to: "/x" },
      { from: "/b", to: "/y" },
    ]);
  });

  it("keeps the first row when it is not a header", () => {
    const rows = parseCsv("/a,/x\n/b,/y");
    expect(rows).toEqual([
      { from: "/a", to: "/x" },
      { from: "/b", to: "/y" },
    ]);
  });

  it("honors quoted fields with escaped quotes and embedded commas", () => {
    const rows = parseCsv('source,target\n"/a,b","/x ""y"""');
    expect(rows).toEqual([{ from: "/a,b", to: '/x "y"' }]);
  });

  it("treats a single column as from-only", () => {
    expect(parseCsv("old\n/a")).toEqual([{ from: "/a" }]);
  });

  it("recognizes old/source header aliases", () => {
    expect(parseCsv("Old URL,New URL\n/a,/x")).toEqual([{ from: "/a", to: "/x" }]);
  });
});

describe("parseSitemapXml", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/a</loc></url>
      <url><loc>https://example.com/b/c</loc></url>
      <url><loc>https://other.test/external</loc></url>
    </urlset>`;

  it("extracts <loc> URLs and strips origin to site-relative paths", () => {
    const paths = parseSitemapXml(xml);
    expect(paths).toContain("/a");
    expect(paths).toContain("/b/c");
    // cross-origin loc is still origin-stripped to its pathname (same-origin
    // guard is applied later at proposal time)
    expect(paths).toContain("/external");
  });

  it("de-dupes repeated locs", () => {
    const dupes = `<urlset><url><loc>https://e.com/a</loc></url><url><loc>https://e.com/a</loc></url></urlset>`;
    expect(parseSitemapXml(dupes)).toEqual(["/a"]);
  });

  it("reads a sitemap index too", () => {
    const idx = `<sitemapindex><sitemap><loc>https://e.com/sitemap-1.xml</loc></sitemap></sitemapindex>`;
    expect(parseSitemapXml(idx)).toEqual(["/sitemap-1.xml"]);
  });

  it("returns [] for empty or non-XML input", () => {
    expect(parseSitemapXml("")).toEqual([]);
    expect(parseSitemapXml("not xml at all")).toEqual([]);
  });
});

describe("proposeMappings", () => {
  const known = ["/about", "/blog/hello-world", "/pricing"];

  it("skips identity mappings", () => {
    const [p] = proposeMappings([{ from: "/about", to: "/about" }], known);
    expect(p!.reason).toBe("identity");
    expect(p!.confidence).toBe(1);
    expect(p!.note).toMatch(/identity/i);
  });

  it("uses an explicit valid same-origin target at confidence 1", () => {
    const [p] = proposeMappings([{ from: "/x", to: "/pricing" }], known);
    expect(p).toMatchObject({ to: "/pricing", confidence: 1, reason: "exact-existing" });
  });

  it("maps to an exact existing route at confidence 1", () => {
    const [p] = proposeMappings([{ from: "/about" }], known);
    expect(p).toMatchObject({ to: "/about", confidence: 1, reason: "exact-existing" });
  });

  it("offers a fuzzy match >= 0.8 as 'similar'", () => {
    const [p] = proposeMappings([{ from: "/blog/hello-worldd" }], known);
    expect(p!.reason).toBe("similar");
    expect(p!.to).toBe("/blog/hello-world");
    expect(p!.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("falls back to a Gone (410) candidate when nothing matches", () => {
    const [p] = proposeMappings([{ from: "/totally/unrelated/deep/path" }], known);
    expect(p).toMatchObject({ to: null, reason: "none-gone" });
  });

  it("treats an off-origin explicit target as Gone (no open redirect)", () => {
    const [p] = proposeMappings([{ from: "/x", to: "https://evil.test" }], known);
    expect(p).toMatchObject({ to: null, reason: "none-gone" });
  });

  it("always emits matchType exact", () => {
    const out = proposeMappings([{ from: "/about" }, { from: "/x" }], known);
    for (const p of out) expect(p.matchType).toBe("exact");
  });
});

describe("sortForReview", () => {
  it("orders lowest confidence first, stable on ties", () => {
    const proposals = proposeMappings(
      [{ from: "/about" }, { from: "/no/match/here" }, { from: "/pricing" }],
      ["/about", "/pricing"],
    );
    const sorted = sortForReview(proposals);
    expect(sorted[0]!.confidence).toBeLessThanOrEqual(sorted[1]!.confidence);
    expect(sorted[1]!.confidence).toBeLessThanOrEqual(sorted[2]!.confidence);
    // the unmatched one (lowest) comes first
    expect(sorted[0]!.from).toBe("/no/match/here");
  });
});
