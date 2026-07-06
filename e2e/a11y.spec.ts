import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility check on the pages using the new structural landmarks
 * (TOC nav, breadcrumb nav, related section). Fails on serious/critical
 * violations — the new blocks must not regress a11y.
 */
const PAGES = ["/e2e-docs/guides/structural", "/e2e-layout"];

for (const path of PAGES) {
  test(`no serious/critical axe violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      serious,
      serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join("\n"),
    ).toEqual([]);
  });
}
