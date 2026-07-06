/**
 * Converts one src/modules/*\/schema.ts file from sqlite-core to pg-core,
 * including RLS injection (.enableRLS() + a pgPolicy() per table). See
 * scripts/swap-db-dialect.ts for the full conversion this module is part of.
 *
 * Also handles a file that's ALREADY on pg-core (e.g. a repo forked after
 * the dialect swap but before RLS injection existed) — in that case it
 * skips the sqlite->pg column-type rewrites (nothing to convert) but still
 * runs RLS injection, since that's a separate concern from dialect.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { OYS_APP_ROLE } from "./config";
import { injectRls } from "./rls";

export function convertSchemaFile(path: string, dryRun: boolean): { changed: boolean; summary: string } {
  const original = readFileSync(path, "utf8");
  const isSqlite = original.includes("drizzle-orm/sqlite-core");
  const isPg = original.includes("drizzle-orm/pg-core");
  if (!isSqlite && !isPg) {
    return { changed: false, summary: "skip (not a Drizzle table schema file)" };
  }

  let src = original;
  let booleans = 0;
  let jsons = 0;
  let bareInts = 0;
  let reals = 0;

  if (isSqlite) {
    src = src.replace(/drizzle-orm\/sqlite-core/g, "drizzle-orm/pg-core");
    src = src.replace(/\bsqliteTable\b/g, "pgTable");
  }

  src = src.replace(
    /\binteger\(("([^"]+)"|'[^']+')\s*,\s*\{\s*mode:\s*"boolean"\s*\}\)/g,
    (_m, lit) => {
      booleans++;
      return `boolean(${lit})`;
    },
  );

  src = src.replace(/\btext\(("([^"]+)"|'[^']+')\s*,\s*\{\s*mode:\s*"json"\s*\}\)/g, (_m, lit) => {
    jsons++;
    return `jsonb(${lit})`;
  });

  src = src.replace(/\breal\(("([^"]+)"|'[^']+')\)/g, (_m, lit) => {
    reals++;
    return `doublePrecision(${lit})`;
  });

  // Bare integer(col) with no options object — timestamps/counters. Must run
  // after the boolean-mode replacement above so it doesn't also match those.
  src = src.replace(/\binteger\(("([^"]+)"|'[^']+')\)/g, (_m, lit) => {
    bareInts++;
    return `bigint(${lit}, { mode: "number" })`;
  });

  // Rewrite the sqlite-core import specifier list to match what's actually
  // used post-conversion: drop `integer`/`real` if no longer referenced,
  // add `boolean`/`jsonb`/`bigint`/`doublePrecision` as needed.
  const importLineMatch = src.match(/^import \{([^}]+)\} from "drizzle-orm\/pg-core";$/m);
  if (importLineMatch) {
    const used = new Set(
      importLineMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (booleans > 0) used.add("boolean");
    if (jsons > 0) used.add("jsonb");
    if (reals > 0) used.add("doublePrecision");
    if (bareInts > 0) used.add("bigint");
    if (!new RegExp(`\\breal\\(`).test(src)) used.delete("real");
    if (!new RegExp(`\\binteger\\(`).test(src)) used.delete("integer");
    used.add("pgPolicy");
    const newImport = `import { ${[...used].sort().join(", ")} } from "drizzle-orm/pg-core";`;
    src = src.replace(importLineMatch[0], newImport);
  }

  const rlsResult = injectRls(src, OYS_APP_ROLE);
  src = rlsResult.src;

  if (!dryRun) writeFileSync(path, src);

  const summary =
    `${booleans} boolean, ${jsons} jsonb, ${bareInts} bigint (bare integer), ${reals} doublePrecision, ` +
    `${rlsResult.tablesLocked} table(s) RLS-locked`;
  return { changed: true, summary };
}
