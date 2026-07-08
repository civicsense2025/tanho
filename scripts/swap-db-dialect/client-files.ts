/**
 * Rewrites the three files that hardcode the libSQL driver/dialect outside
 * the schema layer: src/lib/db/client.ts, seed/lib.ts, drizzle.config.ts.
 * Each entry is an exact-match old/new pair (not regex) so a failed match
 * is loud (logged, not silently skipped) rather than silently leaving
 * stale libSQL code in place.
 */
import { readFileSync, writeFileSync } from "node:fs";

export const CLIENT_FILE_FIXES: Array<{ file: string; from: string; to: string }> = [
  {
    file: "src/lib/db/client.ts",
    from:
      `import { createClient } from "@libsql/client";\n` +
      `import { drizzle } from "drizzle-orm/libsql";\n` +
      `import * as schema from "./schema";\n` +
      `\n` +
      `// Single DB entry point. Swapping the database for another Drizzle dialect\n` +
      `// (Postgres, MySQL, plain SQLite) means changing this factory + regenerating\n` +
      `// migrations — queries in src/modules/*/queries.ts survive unchanged.\n` +
      `// See docs/architecture/adapters.md.\n` +
      `const client = createClient({\n` +
      `  url: process.env.DATABASE_URL ?? "file:./data/dev.db",\n` +
      `  authToken: process.env.TURSO_AUTH_TOKEN,\n` +
      `});\n` +
      `\n` +
      `// Make foreign-key enforcement explicit. Stock SQLite defaults \`foreign_keys\`\n` +
      `// to OFF (silently disabling ON DELETE CASCADE / SET NULL); libsql defaults it\n` +
      `// ON, but set it here so the behavior doesn't depend on the driver's default.\n` +
      `// For the local file URL the client holds a single connection, so one PRAGMA\n` +
      `// covers it. For a remote Turso URL the HTTP protocol is stateless and the\n` +
      `// PRAGMA won't persist across requests — Turso enforces FKs server-side.\n` +
      `//\n` +
      `// Fire-and-forget (no await): the sqlite3 driver executes synchronously for\n` +
      `// file URLs, so the PRAGMA lands before any query. For Turso it's a no-op\n` +
      `// (FKs enforced server-side). Avoiding top-level await keeps this module\n` +
      `// loadable from tsx/CJS contexts (the seed scripts).\n` +
      `void client.execute("PRAGMA foreign_keys = ON");\n` +
      `\n` +
      `export const db = drizzle(client, { schema });\n` +
      `export type Db = typeof db;`,
    to:
      `import { Pool } from "pg";\n` +
      `import { drizzle } from "drizzle-orm/node-postgres";\n` +
      `import * as schema from "./schema";\n` +
      `\n` +
      `// Single DB entry point. Swapping the database for another Drizzle dialect\n` +
      `// means changing this factory + regenerating migrations — queries in\n` +
      `// src/modules/*/queries.ts survive unchanged. See docs/architecture/adapters.md.\n` +
      `const pool = new Pool({ connectionString: process.env.DATABASE_URL });\n` +
      `\n` +
      `export const db = drizzle(pool, { schema });\n` +
      `export type Db = typeof db;`,
  },
  {
    file: "seed/lib.ts",
    from:
      `import { mkdirSync } from "node:fs";\n` +
      `import { createClient } from "@libsql/client";\n` +
      `import { drizzle } from "drizzle-orm/libsql";\n` +
      `import * as schema from "../src/lib/db/schema";\n` +
      `import { resolveEnvPrefix } from "../src/lib/env/prefix";\n` +
      `\n` +
      `// Seed/import scripts run via tsx outside Next.js, so the instrumentation.ts\n` +
      `// boot hook never fires. Resolve prefixed env vars (e.g. TANHO_DATABASE_URL →\n` +
      `// DATABASE_URL) before any read. Canonical names always win. Idempotent.\n` +
      `resolveEnvPrefix();\n` +
      `\n` +
      `/** Standalone DB handle for seed scripts (no Next.js runtime). */\n` +
      `export function seedDb() {\n` +
      `  const url = process.env.DATABASE_URL ?? "file:./data/dev.db";\n` +
      `  if (url.startsWith("file:")) mkdirSync("./data", { recursive: true });\n` +
      `  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });\n` +
      `  return drizzle(client, { schema });\n` +
      `}`,
    to:
      `import { Pool } from "pg";\n` +
      `import { drizzle } from "drizzle-orm/node-postgres";\n` +
      `import * as schema from "../src/lib/db/schema";\n` +
      `import { resolveEnvPrefix } from "../src/lib/env/prefix";\n` +
      `\n` +
      `// Seed/import scripts run via tsx outside Next.js, so the instrumentation.ts\n` +
      `// boot hook never fires. Resolve prefixed env vars (e.g. TANHO_DATABASE_URL →\n` +
      `// DATABASE_URL) before any read. Canonical names always win. Idempotent.\n` +
      `resolveEnvPrefix();\n` +
      `\n` +
      `/** Standalone DB handle for seed scripts (no Next.js runtime). */\n` +
      `export function seedDb() {\n` +
      `  const pool = new Pool({ connectionString: process.env.DATABASE_URL });\n` +
      `  return drizzle(pool, { schema });\n` +
      `}`,
  },
  {
    file: "drizzle.config.ts",
    from:
      `  dialect: "turso",\n` +
      `  dbCredentials: {\n` +
      `    url: process.env.DATABASE_URL ?? "file:./data/dev.db",\n` +
      `    authToken: process.env.TURSO_AUTH_TOKEN,\n` +
      `  },`,
    to: `  dialect: "postgresql",\n  dbCredentials: {\n    url: process.env.DATABASE_URL!,\n  },`,
  },
];

export function convertClientFiles(dryRun: boolean) {
  for (const { file, from, to } of CLIENT_FILE_FIXES) {
    let src: string;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      console.log(`  skip ${file} (not found)`);
      continue;
    }
    if (src.includes(to)) {
      console.log(`  ${file}: already converted`);
      continue;
    }
    if (!src.includes(from)) {
      console.log(
        `  ${file}: WARNING — expected libSQL block not found (file has drifted since this ` +
        `script was written). Convert by hand — see docs/recipes/swap-database-to-postgres.md.`,
      );
      continue;
    }
    if (!dryRun) writeFileSync(file, src.replace(from, to));
    console.log(`  ${file}: converted to node-postgres`);
  }
}
