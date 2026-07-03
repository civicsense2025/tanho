/**
 * Whole-site import CLI — applies a .tar.gz bundle produced by GET
 * /api/admin/export.
 *
 *   npm run import -- <path-to-bundle.tar.gz>
 *
 * Chosen over a multipart POST route because: (1) site bundles can carry
 * every uploaded file, easily tens of MB, which is awkward to buffer through
 * a route handler without a streaming multipart parser (a new dependency);
 * (2) an operator restoring/migrating a site already has shell access, so a
 * CLI is no extra friction; (3) it reuses the exact same applySiteImport /
 * parseExportArchive functions the export side of this module owns — no
 * separate code path to keep in sync. The export direction stays a route
 * (browser download needs HTTP), the import direction is a script.
 *
 * Idempotent: re-running overwrites existing rows by natural key (see
 * modules/portability/natural-keys.ts) rather than duplicating them.
 */
import { readFile } from "node:fs/promises";
import { parseExportArchive } from "../src/modules/portability/archive";
import { applySiteImport } from "../src/modules/portability/import";
import { log } from "./lib";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npm run import -- <path-to-bundle.tar.gz>");
    process.exit(1);
  }

  log(`Reading bundle: ${path}`);
  const gz = await readFile(path);
  const { content, files } = parseExportArchive(new Uint8Array(gz));

  log(
    `Bundle format ${content.manifest.format}, generated ${new Date(content.manifest.generatedAt).toISOString()}, includesPeople=${content.manifest.includesPeople}`,
  );

  const result = await applySiteImport(content, files);
  if (!result.ok) {
    console.error(`[import] failed: ${result.error}`);
    process.exit(1);
  }

  log("Import complete:");
  for (const [table, count] of Object.entries(result.counts)) {
    log(`  ${table}: ${count}`);
  }
}

main().catch((err) => {
  console.error("[import] failed:", err);
  process.exit(1);
});
