import { defineConfig, devices } from "@playwright/test";

/**
 * Real-browser e2e for the structural blocks + advanced layout — the coverage
 * the headless preview tool can't give (it renders at 0-height, so scroll /
 * sticky / responsive can't be exercised there). Chromium only (the cached
 * browser); three viewport projects for responsive checks, plus a JS-disabled
 * project that proves the no-JS / crawler fallback.
 *
 * The webServer runs `next dev` on a DEDICATED port so it never collides with a
 * hand-started dev server. globalSetup seeds the fixture pages first.
 */
const PORT = 3199;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false, // shared dev server + one sqlite file
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: "**/no-js.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "tablet",
      testIgnore: "**/no-js.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 800, height: 1000 } },
    },
    {
      name: "mobile",
      testIgnore: "**/no-js.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 800 } },
    },
    {
      // Proves crawler-visibility + progressive-enhancement fallback: full
      // content present, links work, without any JavaScript.
      name: "no-js",
      testMatch: "**/no-js.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        javaScriptEnabled: false,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
