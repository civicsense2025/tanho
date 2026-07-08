import { test, expect } from "@playwright/test";

/**
 * E2e verification that the platform boots with auto-migration (no manual
 * `npm run db:migrate` needed). The Playwright webServer starts `next dev`,
 * which triggers instrumentation.ts → runMigrations() before any route loads.
 * If migrations fail, every subsequent test would fail — but this file makes
 * the boot-to-database path explicit so a regression in the auto-migration
 * hook surfaces as a named test failure, not just collateral damage.
 */

test.describe("auto-migration on boot", () => {
  test("home page loads (database tables exist after auto-migrate)", async ({ page }) => {
    // If instrumentation.ts → runMigrations() failed, the home page would
    // throw a 500 (missing tables). A 200 with visible content proves the
    // schema was created automatically.
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("admin login page is accessible (auth tables migrated)", async ({ page }) => {
    const response = await page.goto("/admin/login");
    expect(response?.status()).toBeLessThan(500);
    // The login form renders — proves the users/sessions tables exist.
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
  });

  test("seeded e2e fixture page loads (content tables migrated + seeded)", async ({ page }) => {
    // The globalSetup seeds fixture pages. If migrations didn't run, the
    // seed script would have failed and this page wouldn't exist.
    const response = await page.goto("/e2e-layout");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: "Responsive Layout" })).toBeVisible();
  });

  test("no console errors on home page after boot", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
