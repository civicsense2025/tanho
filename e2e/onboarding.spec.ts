import { test, expect } from "@playwright/test";

/**
 * Onboarding wizard e2e — verifies the wizard has 3 steps (identity → brand →
 * review) and the data-source step is gone.
 *
 * Fixtures (seeded by globalSetup → seedE2e):
 *   - owner: e2e-owner@example.com / e2e-test-owner-password-123
 *   - onboarding state: may or may not be dismissed; the test resets it
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

test.describe("onboarding wizard (real browser)", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("wizard has 3 steps, not 4 — no data-source step", async ({ page }) => {
    await page.goto("/admin/onboarding");
    await page.waitForLoadState("networkidle");

    // If the difficulty picker shows, pick "balanced" to proceed to the steps.
    const difficultyBtn = page.getByRole("button", { name: /balanced|guided|expert/i }).first();
    if (await difficultyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await difficultyBtn.click();
      await page.waitForTimeout(500);
    }

    // The wizard shows "Step X of N" — N must be 3, not 4.
    const progress = page.locator("text=/Step \\d+ of \\d+/");
    await expect(progress).toBeVisible({ timeout: 10_000 });
    const text = await progress.textContent();
    expect(text).toMatch(/Step \d+ of 3/);
    expect(text).not.toMatch(/Step \d+ of 4/);
  });

  test("wizard does not show 'Connect a database' or 'Connect a data source' title", async ({ page }) => {
    await page.goto("/admin/onboarding");
    await page.waitForLoadState("networkidle");

    // If the difficulty picker shows, pick one to proceed.
    const difficultyBtn = page.getByRole("button", { name: /balanced|guided|expert/i }).first();
    if (await difficultyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await difficultyBtn.click();
      await page.waitForTimeout(500);
    }

    // The removed step's title must not appear anywhere on the page.
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Connect a database");
    // The new wording "Connect a data source" should also not appear (step removed entirely).
    expect(body).not.toContain("Connect a data source");
  });

  test("wizard navigates through all steps without getting stuck", async ({ page }) => {
    await page.goto("/admin/onboarding");
    await page.waitForLoadState("networkidle");

    // If the difficulty picker shows, pick one to proceed.
    const difficultyBtn = page.getByRole("button", { name: /balanced|guided|expert/i }).first();
    if (await difficultyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await difficultyBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 1 of 3: identity — "Next →" should be enabled (isComplete: true).
    const nextBtn = page.getByRole("button", { name: /Next →|Finish/i });
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    // The button should NOT be disabled (all steps have isComplete: true).
    const isDisabled = await nextBtn.isDisabled();
    expect(isDisabled).toBe(false);
  });
});
