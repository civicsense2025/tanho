import { test, expect } from "@playwright/test";

/**
 * Theme + appearance e2e — verifies the site-level `data-theme` attribute on
 * <html> and the per-section `data-theme` override on <section> blocks.
 *
 * Fixtures (seeded by globalSetup → seedE2e):
 *   - /e2e-theme: a page with three sections (light, dark, inherit)
 *   - appearance settings: siteMode "system" (the default)
 */

test.describe("theme + appearance (real browser)", () => {
  test("<html> has a data-theme attribute from appearance settings", async ({ page }) => {
    await page.goto("/e2e-theme");
    const attr = await page.locator("html").getAttribute("data-theme");
    // Default appearance is "system" — the attribute should be present and one
    // of the three valid modes. The exact value depends on the DB state, but
    // it must never be null (the layout always sets it).
    expect(attr).not.toBeNull();
    expect(["light", "dark", "system"]).toContain(attr);
  });

  test("section with themeMode=light emits data-theme=light", async ({ page }) => {
    await page.goto("/e2e-theme");
    // The data-theme is on the inner <section> element, not the [data-block] wrapper div.
    const sec = page.locator('[data-block="section"] > section').first();
    await expect(sec).toHaveAttribute("data-theme", "light");
  });

  test("section with themeMode=dark emits data-theme=dark", async ({ page }) => {
    await page.goto("/e2e-theme");
    const sec = page.locator('[data-block="section"] > section').nth(1);
    await expect(sec).toHaveAttribute("data-theme", "dark");
  });

  test("section with themeMode=inherit omits data-theme", async ({ page }) => {
    await page.goto("/e2e-theme");
    const sec = page.locator('[data-block="section"] > section').nth(2);
    const attr = await sec.getAttribute("data-theme");
    expect(attr).toBeNull();
  });

  test("no console errors on the theme showcase page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/e2e-theme");
    await page.waitForLoadState("networkidle");
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
