import { test, expect } from "@playwright/test";

/**
 * Scheduling system e2e — admin tabs + public booking flow.
 *
 * Regression coverage for the libsql URL_SCHEME_NOT_SUPPORTED error: a client
 * component importing a server-only barrel dragged @libsql/client's web build
 * into the browser bundle. The error surfaces as a pageerror on /admin/scheduling,
 * so every admin tab test asserts zero console errors / pageerrors.
 *
 * Fixtures (seeded by globalSetup → seedE2e):
 *   - owner: e2e-owner@example.com / e2e-test-owner-password-123
 *   - event type: slug "e2e-intro", free, 30 min, active
 *   - availability: every day 00:00–23:00 UTC, no min notice (slots exist now)
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

test.describe.configure({ mode: "serial" });

test.describe("admin scheduling tabs (real browser)", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  // Each tab test asserts the tab content renders AND no console error / pageerror
  // fires — the direct regression check for the libsql client-bundle error.
  const tabs: Array<{ tab: string; heading: string }> = [
    { tab: "bookings", heading: "Scheduling" },
    { tab: "event-types", heading: "Scheduling" },
    { tab: "availability", heading: "Google Calendar" },
    { tab: "extensions", heading: "Scheduling" },
    { tab: "templates", heading: "Placeholders" },
  ];

  for (const { tab, heading } of tabs) {
    test(`${tab} tab loads with no console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(`/admin/scheduling?tab=${tab}`);
      await page.waitForLoadState("networkidle");

      // The page-level h1 is "Scheduling"; availability/templates have a
      // section heading we can also assert to confirm content rendered.
      await expect(page.getByRole("heading", { name: "Scheduling", level: 1 })).toBeVisible();
      if (heading !== "Scheduling") {
        await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      }

      expect(errors, errors.join("\n")).toHaveLength(0);
    });
  }

  test("tab navigation switches tabs via URL", async ({ page }) => {
    await page.goto("/admin/scheduling?tab=bookings");
    await expect(page.getByRole("button", { name: "Event types" })).toBeVisible();
    await page.getByRole("button", { name: "Event types" }).click();
    await page.waitForURL(/tab=event-types/);
    await expect(page.getByRole("button", { name: "+ Event type" })).toBeVisible();
  });
});

test.describe("public booking flow (real browser)", () => {
  test("event picker lists the e2e event type", async ({ page }) => {
    await page.goto("/book");
    await expect(page.getByRole("heading", { name: "Book a time" })).toBeVisible();
    await expect(page.getByRole("link", { name: /E2E Intro Call/ })).toBeVisible();
  });

  test("full booking flow: pick slot → intake → confirm → manage", async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    // 1. Event picker → event page.
    await page.goto("/book");
    await page.getByRole("link", { name: /E2E Intro Call/ }).click();
    await page.waitForURL("**/book/e2e-intro");

    // 2. Wait for slots to load. If today has no slots (late in the day UTC),
    // navigate to tomorrow where the full window is available.
    await expect(page.getByText("Loading times")).toHaveCount(0, { timeout: 10_000 });
    if (await page.getByText("No times available this day.").isVisible()) {
      await page.getByRole("button", { name: "Next day" }).click();
      await expect(page.getByText("Loading times")).toHaveCount(0, { timeout: 10_000 });
    }
    const firstSlot = page.locator("button", { hasText: /^\d{2}:\d{2}$/ }).first();
    await expect(firstSlot).toBeVisible({ timeout: 10_000 });
    await firstSlot.click();

    // 3. Wait for the intake form to render (the slot click activates it),
    // then fill name + email and confirm. The IntakePanel uses label spans,
    // not placeholders, so we locate inputs via their labels.
    await expect(page.getByText("Your details").first()).toBeVisible({ timeout: 10_000 });
    await page.locator("label").filter({ hasText: "Name" }).locator("input").fill("Test Guest");
    await page.locator("label").filter({ hasText: "Email" }).locator("input").fill("e2e-guest@example.com");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    // 4. Confirmation screen with a manage code.
    await expect(page.getByText("Confirmed")).toBeVisible({ timeout: 10_000 });
    const manageLink = page.getByRole("link", { name: "Manage booking" });
    await expect(manageLink).toBeVisible();
    const href = await manageLink.getAttribute("href");
    expect(href).toMatch(/^\/book\/manage\/[A-Z0-9]+$/);

    // 5. Follow the manage link → ManagePanel renders.
    await manageLink.click();
    await page.waitForURL(/\/book\/manage\//);
    await expect(page.getByRole("heading", { name: "E2E Intro Call" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reschedule" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel booking" })).toBeVisible();

    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
