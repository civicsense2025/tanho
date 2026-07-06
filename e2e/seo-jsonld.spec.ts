import { test, expect } from "@playwright/test";

/**
 * Structured-data (schema.org JSON-LD) activation. The builders in
 * src/modules/seo/jsonld.ts were defined but never emitted; these assert the
 * page route now emits them for the right page kinds, escaped through
 * safeJsonLd (via <JsonLd>). Entity-path builders (project→CreativeWork,
 * guide→Article) are covered by unit tests in src/modules/seo, since the e2e
 * DB has no seeded entity graph.
 */
test.describe("structured data (JSON-LD)", () => {
  test("a post page emits schema.org Article JSON-LD", async ({ page }) => {
    await page.goto("/e2e-post");
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const parsed = scripts.map((s) => JSON.parse(s));
    const articleLd = parsed.find((p) => p["@type"] === "Article");
    expect(articleLd, "Article JSON-LD must be present on a post").toBeTruthy();
    expect(articleLd["@context"]).toBe("https://schema.org");
    expect(articleLd.headline).toBe("E2E Post Title");
    expect(articleLd.description).toBe("A concise post summary for structured data.");
    // url is absolute (built from siteUrl), and publisher is the site.
    expect(String(articleLd.url)).toMatch(/\/e2e-post$/);
    expect(articleLd.publisher?.["@type"]).toBe("Organization");
  });

  test("a plain page does NOT emit Article JSON-LD", async ({ page }) => {
    await page.goto("/e2e-layout");
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const hasArticle = scripts
      .map((s) => JSON.parse(s))
      .some((p) => p["@type"] === "Article");
    expect(hasArticle, "a kind:page must not advertise as an Article").toBe(false);
  });
});
