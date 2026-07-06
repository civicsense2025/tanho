import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` is a build-time guard (ships with Next) that throws if a server
      // module is imported into a client bundle. It isn't resolvable under the node test
      // env, so alias it to a no-op stub — lets server-only-guarded modules (e.g.
      // @/modules/seo, reached transitively by the WordPress importer) load in tests.
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "seed/**/*.test.ts"],
    environment: "node",
  },
});
