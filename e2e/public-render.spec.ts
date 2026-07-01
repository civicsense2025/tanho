import { test, expect } from "@playwright/test";

// Baseline: the public site renders with the configured identity. Phase 3's block-system
// refactor must keep this green (zero visual/behavior change is the contract).
test("homepage renders with the site title in <head>", async ({ page }) => {
  await page.goto("/");
  // layout.tsx sources <title> from siteConfig; unconfigured = the template default.
  await expect(page).toHaveTitle(/Tan Ho/);
  // The homepage block tree renders a <main>.
  await expect(page.locator("main")).toBeVisible();
  // The profile-header data-bound block from content/pages/home.json actually renders its
  // content — proves parseBlocks kept the real blocks rather than silently dropping them.
  await expect(page.getByText(/Tan Ho/).first()).toBeVisible();
  // Theme is data-driven: <html data-theme> defaults to "system" (preserves OS auto-dark).
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
});

test("sitemap and robots are served", async ({ page }) => {
  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const robots = await page.request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
});
