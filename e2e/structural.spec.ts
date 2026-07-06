import { test, expect } from "@playwright/test";

const PAGE = "/e2e-docs/guides/structural";

/** Scroll so an element's top sits `offset` px below the viewport top. */
async function scrollHeadingToTop(page: import("@playwright/test").Page, id: string, offset = 10) {
  await page.evaluate(
    ([anchorId, off]) => {
      const el = document.getElementById(anchorId as string);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - (off as number));
    },
    [id, offset] as const,
  );
}

test.describe("structural blocks (real browser)", () => {
  test("table of contents lists page headings with working anchors", async ({ page }) => {
    await page.goto(PAGE);
    const toc = page.locator("nav[data-toc]");
    await expect(toc).toBeVisible();
    await expect(toc.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "#overview");
    await expect(toc.locator('a[href="#usage-2"]')).toHaveCount(1);
    await expect(page.locator("#usage-2")).toHaveCount(1);
  });

  test("clicking a TOC link scrolls the heading to the top", async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('nav[data-toc] a[href="#usage"]').first().click();
    await expect
      .poll(async () => page.locator("#usage").evaluate((el) => Math.round(el.getBoundingClientRect().top)))
      .toBeLessThan(120);
  });

  test("scroll-spy marks the deepest scrolled-past section active", async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForTimeout(300);
    // At the very top, the first heading is active (TOC never blank).
    await expect(page.locator('nav[data-toc] a[aria-current="location"]')).toHaveAttribute(
      "data-toc-link",
      "overview",
    );
    // Scroll Usage to the top → it (or a deeper h3 above the line) becomes active.
    await scrollHeadingToTop(page, "usage");
    await expect
      .poll(async () =>
        page.locator('nav[data-toc] a[aria-current="location"]').first().getAttribute("data-toc-link"),
      )
      .toBe("usage");
  });

  test("reading-progress fills toward 100% at the bottom", async ({ page }) => {
    await page.goto(PAGE);
    const scaleX = () =>
      page.evaluate(() => {
        const fill = document.querySelector("[data-reading-progress] > *") as HTMLElement | null;
        if (!fill) return -1;
        const m = new DOMMatrixReadOnly(getComputedStyle(fill).transform);
        return m.a; // scaleX
      });
    await page.evaluate(() => window.scrollTo(0, 0));
    // Poll rather than a fixed wait: the CSS scroll-timeline (and the rAF
    // fallback) settle a frame or two after scrollTo, and the settle time
    // varies by viewport — a fixed timeout flakes at the 0.9 threshold on
    // shorter (mobile/tablet) pages.
    await expect.poll(scaleX, { timeout: 3000 }).toBeLessThan(0.2);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(scaleX, { timeout: 3000 }).toBeGreaterThan(0.9);
  });

  test("jump-to-top reveals on scroll and returns to top when clicked", async ({ page }) => {
    await page.goto(PAGE);
    const btn = page.locator("[data-jump-top]");
    // Enhanced (JS on) → hidden at the top.
    await expect
      .poll(async () => btn.evaluate((el) => getComputedStyle(el).opacity))
      .toBe("0");
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect.poll(async () => btn.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await btn.click();
    // The page opts into smooth scrolling (data-toc-smooth), so the jump from
    // 1200px animates — give it a generous window to settle. It rests just
    // below the sticky site header (~61px tall), which is correct: the #top
    // anchor lands under the sticky chrome, not at a raw scrollY of 0. Assert
    // it returned to the top region (within the header offset), matching the
    // TOC-click test's tolerance.
    await expect
      .poll(async () => page.evaluate(() => window.scrollY), { timeout: 4000 })
      .toBeLessThan(120);
  });

  test("breadcrumbs render the trail + BreadcrumbList JSON-LD", async ({ page }) => {
    await page.goto(PAGE);
    const crumbs = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(crumbs).toBeVisible();
    await expect(crumbs.getByRole("link", { name: "E2E Docs" })).toHaveAttribute("href", "/e2e-docs");
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText("Structural Blocks");
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(ld!);
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement.length).toBeGreaterThanOrEqual(3);
  });

  test("no console errors or horizontal overflow", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(PAGE);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, "page must not scroll horizontally").toBe(false);
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
