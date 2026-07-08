import { defineConfig } from "drizzle-kit";
import { resolveEnvPrefix } from "./src/lib/env/prefix";

// Resolve prefixed env vars (e.g. TANHO_DATABASE_URL → DATABASE_URL) before
// drizzle-kit reads them. drizzle-kit runs as a plain Node script outside
// Next.js, so the instrumentation.ts boot hook never fires here. Canonical
// names always win. See src/lib/env/prefix.ts for the full rules.
resolveEnvPrefix();

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
