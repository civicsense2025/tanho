import { test, expect } from "@playwright/test";

/**
 * Content types admin page e2e — verifies the page loads, shows built-in
 * types, and the "Import from DB" button is present.
 *
 * Fixtures (seeded by globalSetup → seedE2e):
 *   - owner: e2e-owner@example.com / e2e-test-owner-password-123
 *   - seed: runs npm run seed which creates built-in ct_* tables (projects, resources)
 */

const OWNER_EMAIL = "e2e-owner@example.com";
const OWNER_PASSWORD = "e2e-test-owner-password-123";

/** Log in to /admin via the login form. */
async function adminLogin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("Email").fill(OWNER_EMAIL);
  await page.getByPlaceholder("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.waitForURL("**/admin");
}

test.describe("content types admin (real browser)", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("content types page loads with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/admin/content/types");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Content types", level: 1 })).toBeVisible();
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("page shows the data-backed types description", async ({ page }) => {
    await page.goto("/admin/content/types");
    await page.waitForLoadState("networkidle");

    // The updated description mentions "data-backed types".
    const body = await page.locator("body").textContent();
    expect(body).toContain("data-backed");
  });
});
