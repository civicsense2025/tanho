import { describe, expect, it } from "vitest";
import { buildLlmsTxt, type LlmsLink } from "./llms-txt";
import type { AiCrawlersSettings } from "./validation";

// The builder only reads settings.rsl; a minimal cast keeps the test focused.
const rslOff = { rsl: { enabled: false, priceUsd: "0.00", unit: "crawl" } } as AiCrawlersSettings;

describe("buildLlmsTxt", () => {
  it("always advertises the sitemap + robots", () => {
    const out = buildLlmsTxt(rslOff, "Acme", "https://acme.test");
    expect(out).toContain("# Acme");
    expect(out).toContain("[Sitemap](https://acme.test/sitemap.xml)");
    expect(out).toContain("[Robots](https://acme.test/robots.txt)");
  });

  it("lists key pages as absolute links under a Key pages heading", () => {
    const keyPages: LlmsLink[] = [
      { title: "Resources", path: "/resources" },
      { title: "Guides", path: "/guides" },
    ];
    const out = buildLlmsTxt(rslOff, "Acme", "https://acme.test/", keyPages);
    expect(out).toContain("## Key pages");
    expect(out).toContain("[Resources](https://acme.test/resources)");
    expect(out).toContain("[Guides](https://acme.test/guides)");
  });

  it("omits the Key pages section when there are none", () => {
    expect(buildLlmsTxt(rslOff, "Acme", "https://acme.test")).not.toContain("## Key pages");
  });

  it("drops malformed links (empty title or non-absolute path)", () => {
    const out = buildLlmsTxt(rslOff, "Acme", "https://acme.test", [
      { title: "", path: "/x" },
      { title: "Bad", path: "relative" },
      { title: "Good", path: "/good" },
    ]);
    expect(out).toContain("[Good](https://acme.test/good)");
    expect(out).not.toContain("relative");
  });

  it("strips markup characters from a link title", () => {
    const out = buildLlmsTxt(rslOff, "Acme", "https://acme.test", [
      { title: "A <b>Title</b> #1", path: "/p" },
    ]);
    expect(out).not.toContain("<b>");
    expect(out).not.toContain("#1");
  });

  it("adds the RSL licensing line when enabled", () => {
    const rslOn = { rsl: { enabled: true, priceUsd: "0.05", unit: "crawl" } } as AiCrawlersSettings;
    const out = buildLlmsTxt(rslOn, "Acme", "https://acme.test");
    expect(out).toContain("## Licensing");
    expect(out).toContain("$0.05 USD per crawl");
  });
});
