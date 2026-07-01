import { test, expect } from "@playwright/test";

// Baseline: the proxy protects /admin. An unauthenticated visit redirects to login; a correct
// password grants access. This pins the auth boundary before later phases add reader tokens.
test("unauthenticated /admin redirects to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("correct password logs in and reaches the dashboard", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByRole("textbox").fill("e2e-test-password");
  await page.getByRole("button").click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
});

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByRole("textbox").fill("definitely-wrong");
  await page.getByRole("button").click();
  await expect(page.getByText(/wrong password/i)).toBeVisible();
});
