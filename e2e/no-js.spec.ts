import { test, expect } from "@playwright/test";

/**
 * Runs with JavaScript DISABLED (the `no-js` project). Proves the structural
 * blocks are crawler-friendly and progressively enhanced: all content is in the
 * server HTML and every link works without any client JS.
 *
 * These assert DOM *presence* (toBeAttached / toHaveCount / attribute values),
 * NOT rendered visibility (toBeVisible). That's deliberate: `next dev` streams
 * server content inside a `<div hidden>` Suspense placeholder that client JS
 * un-hides after flush — so with JS disabled the dev server reports a 0×0 box
 * even though the markup is fully present. A crawler parses the raw HTML (it
 * never computes layout), and a production build (`next start`) flushes the
 * content inline, so presence — not a non-zero box — is what actually proves
 * crawler-friendliness here.
 */
test.describe("no-JS / crawler fallback", () => {
  test("TOC + all heading content present and anchors work without JS", async ({ page }) => {
    await page.goto("/e2e-docs/guides/structural");

    // TOC is a real server-rendered nav with working anchor links.
    const toc = page.locator("nav[data-toc]");
    await expect(toc).toBeAttached();
    await expect(toc.locator('a[href="#overview"]')).toBeAttached();

    // Every heading the TOC links to exists in the DOM (content not JS-gated).
    for (const id of ["overview", "details", "sub-detail", "usage", "usage-2"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    // Anchor navigation still works: the link's href is the fragment target and
    // that target exists in the DOM. (Clicking a 0×0 dev-streamed element is
    // unreliable; the href → existing #id pair is what a crawler/browser follows.)
    await expect(toc.locator('a[href="#usage"]')).toHaveAttribute("href", "#usage");
    await expect(page.locator("#usage")).toHaveCount(1);
  });

  test("breadcrumbs + JSON-LD present without JS", async ({ page }) => {
    await page.goto("/e2e-docs/guides/structural");
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeAttached();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld!)["@type"]).toBe("BreadcrumbList");
  });

  test("jump-to-top is a real anchor to #top, shown (not enhanced-hidden) without JS", async ({ page }) => {
    await page.goto("/e2e-docs/guides/structural");
    const btn = page.locator("[data-jump-top]");
    await expect(btn).toHaveAttribute("href", "#top");
    // With no JS the island never sets [data-blocks-enhanced], so the
    // hide-until-scrolled rule never applies: the button stays fully opaque.
    // (It's position:fixed, so toBeVisible is unreliable — assert the styles.)
    expect(await btn.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-blocks-enhanced"))).toBe(false);
  });

  test("reading-progress bar renders inertly (no error) without JS", async ({ page }) => {
    await page.goto("/e2e-docs/guides/structural");
    await expect(page.locator("[data-reading-progress]")).toHaveCount(1);
  });
});
