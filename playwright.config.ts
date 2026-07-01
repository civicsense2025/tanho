import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against a real production build. The webServer boots `next start` with a throwaway
 * file-backed libsql DB (migrations auto-run on first request) so no external service is
 * needed. These specs are the pre-refactor behavioral baseline: Phase 3's block-system
 * unification must keep them green.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DB_PROVIDER: "turso",
      TURSO_DATABASE_URL: "file:./db/e2e.db",
      ADMIN_PASSWORD: "e2e-test-password",
      ADMIN_SECRET: "e2e-test-secret-at-least-32-characters-long",
      // Exercise the newsletter surface in e2e.
      NEXT_PUBLIC_FEATURE_NEWSLETTER: "true",
    },
  },
});
