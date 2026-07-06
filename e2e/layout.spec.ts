import { test, expect } from "@playwright/test";

test.describe("advanced layout + custom CSS (real browser)", () => {
  test("row columns respond to viewport (real @media, one served page)", async ({ page }, testInfo) => {
    await page.goto("/e2e-layout");
    // The row block's id becomes a scoping *class* (`.pb-row1`), not an `id`
    // attribute — `[data-block="row"]` is the stable public hook.
    const row = page.locator('[data-block="row"]').first();
    await expect(row).toBeVisible();
    // Computed gridTemplateColumns is resolved pixel tracks ("400px 400px …").
    // Count the tracks to prove the @media breakpoints actually took effect.
    const trackCount = await row.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
    );
    const expected = testInfo.project.name === "mobile" ? 1 : testInfo.project.name === "tablet" ? 2 : 3;
    expect(trackCount, `expected ${expected} columns at ${testInfo.project.name}`).toBe(expected);
  });

  test("custom CSS is applied to the target and scoped (no double-scope)", async ({ page }) => {
    await page.goto("/e2e-layout");
    const target = page.locator('[data-block="quote"]').first();
    await expect(target).toBeVisible();
    // The authored `.pb-custom-scope [data-block=quote] { outline: 3px … }` must
    // actually paint (proves injection + scope match, and that the sanitizer did
    // NOT double-scope the author-supplied .pb-custom-scope into a dead selector).
    const outlineWidth = await target.evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(parseFloat(outlineWidth)).toBeGreaterThan(0);
    const styleText = await page.locator("style[data-custom-css]").first().textContent();
    expect(styleText).toContain(".pb-custom-scope");
    // Exactly one scope prefix, never two.
    expect(styleText).not.toContain(".pb-custom-scope .pb-custom-scope");
  });

  test("no horizontal overflow at this viewport", async ({ page }) => {
    await page.goto("/e2e-layout");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  });
});

test.describe("paywall TOC leak (security)", () => {
  test("anonymous view does not leak gated headings in the TOC", async ({ page }) => {
    await page.goto("/e2e-paywall");
    // Free heading is listed; gated one is NOT (built from the visible tree).
    await expect(page.locator('nav[data-toc] a[href="#free-section"]')).toHaveCount(1);
    await expect(page.locator('nav[data-toc] a[href="#secret-members-strategy"]')).toHaveCount(0);
    // The gated title must not appear anywhere in the served HTML.
    const html = await page.content();
    expect(html).not.toContain("Secret Members Strategy");
  });
});
