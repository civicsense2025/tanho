/**
 * swap-db-dialect.ts — one-time conversion of the Drizzle schema layer from
 * SQLite (sqlite-core) to Postgres (pg-core).
 *
 * Drizzle has no dialect-agnostic schema API: `sqliteTable`/`pgTable` and
 * their column builders are separate modules per dialect, so switching the
 * primary database means converting every `src/modules/*\/schema.ts` file,
 * not just the client factory. See docs/recipes/swap-database-to-postgres.md
 * for the full swap procedure — this script does the schema files and the
 * three client/config files mechanically instead of by hand.
 *
 * WHAT IT DOES, per schema.ts file that imports drizzle-orm/sqlite-core:
 *   - import source drizzle-orm/sqlite-core -> drizzle-orm/pg-core
 *   - sqliteTable -> pgTable (import name + every call site)
 *   - integer(col, { mode: "boolean" }) -> boolean(col)
 *   - text(col, { mode: "json" }) -> jsonb(col)
 *   - bare integer(col) (timestamps/counters, no mode) -> bigint(col, { mode: "number" })
 *   - real(col) -> doublePrecision(col)
 *   - everything else (enum text, primaryKey, notNull/default/unique,
 *     $defaultFn, $type<T>()) is left untouched — only the import source moves
 *   - every pgTable(...) call gets .enableRLS() chained on, and a
 *     "<table>_app_only" pgPolicy granting full access to the OYS_APP_ROLE
 *     Postgres role (see docs/recipes/swap-database-to-postgres.md's "Create
 *     the app role" step) — defense-in-depth so a leaked Supabase anon/
 *     service key or a stray DATABASE_URL to a different role can't read or
 *     write tables via PostgREST or the SQL editor. This does NOT replace
 *     the app's real authorization (requireUser()/requireApiUser() in every
 *     server action) — it's a second, coarser gate at the database level.
 *
 * It also fixes the small number of SQLite-only query terminators
 * (`.get()` / `.all()`) that Postgres's async driver doesn't have, and
 * rewrites src/lib/db/client.ts, seed/lib.ts, and drizzle.config.ts to the
 * node-postgres driver.
 *
 * This does NOT touch src/modules/*\/queries.ts or actions.ts — those go
 * through Drizzle's query builder and are dialect-clean already. It also
 * does NOT emit `FORCE ROW LEVEL SECURITY` (Drizzle has no schema-level API
 * for it — `.enableRLS()` only ever compiles to `ENABLE ROW LEVEL
 * SECURITY`, which table owners still bypass) or create the app role/grants
 * — those are a one-time `drizzle-kit generate --custom` migration using
 * scripts/postgres-rls-force.sql, see the recipe doc.
 *
 * USAGE
 *   npx tsx scripts/swap-db-dialect.ts            # convert in place
 *   npx tsx scripts/swap-db-dialect.ts --dry-run   # print what would change, write nothing
 *
 * Idempotent: a schema file already on pg-core (no drizzle-orm/sqlite-core
 * import) is skipped, a table that already calls .enableRLS() is left
 * alone, and client/config files already converted are detected and
 * skipped too — safe to re-run after a partial conversion.
 */
import { OYS_APP_ROLE, MODULES_ROOT } from "./swap-db-dialect/config";
import { findSchemaFiles } from "./swap-db-dialect/find-schema-files";
import { convertSchemaFile } from "./swap-db-dialect/schema";
import { fixQueryTerminators } from "./swap-db-dialect/query-terminators";
import { convertClientFiles } from "./swap-db-dialect/client-files";

const DRY_RUN = process.argv.includes("--dry-run");

function main() {
  console.log(`swap-db-dialect: converting sqlite-core -> pg-core${DRY_RUN ? " (dry run)" : ""}\n`);

  const files = findSchemaFiles(MODULES_ROOT).sort();
  console.log(`Found ${files.length} schema file(s) under ${MODULES_ROOT}/\n`);

  let converted = 0;
  for (const file of files) {
    const { changed, summary } = convertSchemaFile(file, DRY_RUN);
    console.log(`  ${file}: ${summary}`);
    if (changed) converted++;
  }

  console.log(`\nConverted ${converted}/${files.length} schema files.\n`);

  console.log("Fixing SQLite-only query terminators (.get()/.all()):");
  fixQueryTerminators(DRY_RUN);

  console.log("\nConverting src/lib/db/client.ts, seed/lib.ts, drizzle.config.ts:");
  convertClientFiles(DRY_RUN);

  console.log(
    `\nNext steps (not done by this script — see docs/recipes/swap-database-to-postgres.md):\n` +
      `  1. npm install pg (remove @libsql/client if you like)\n` +
      `  2. Create the "${OYS_APP_ROLE}" Postgres role and point DATABASE_URL at it\n` +
      `     (this MUST happen before step 3 — CREATE POLICY ... TO ${OYS_APP_ROLE} fails\n` +
      `     if the role doesn't exist yet)\n` +
      `  3. rm -rf drizzle/ && npm run db:generate && npm run db:migrate\n` +
      `  4. npm run typecheck to confirm\n` +
      `  5. npx drizzle-kit generate --custom --name enable-force-rls, then replace its\n` +
      `     contents with scripts/postgres-rls-force.sql (role grants + FORCE ROW LEVEL\n` +
      `     SECURITY — Drizzle has no schema-level API for FORCE RLS)\n` +
      `  6. npm run db:migrate again to apply the FORCE RLS migration\n` +
      `  7. npm run seed to confirm the app works end-to-end connected as ${OYS_APP_ROLE}`,
  );
}

main();
