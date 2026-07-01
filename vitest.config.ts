import { defineConfig } from "vitest/config";

// Node-environment unit/integration tests. `@/` resolves via Vite's native tsconfig-paths
// support (resolve.tsconfigPaths) so tests import app modules exactly as the app does.
// Playwright e2e specs live under e2e/ and are excluded here — they run through `test:e2e`
// against a built app, not Vitest.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e/**"],
    // The 3-backend adapter contract suite spins up mongodb-memory-server (a real binary
    // download on first run) and file-backed libsql — give it room beyond the 5s default.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
