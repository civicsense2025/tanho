import { storage } from "@/adapters/storage";
import { db } from "@/lib/db/client";
import { CORE_TABLES, PEOPLE_TABLES, BUNDLE_FORMAT } from "./manifest";
import type { SiteContent } from "./manifest";
import { NATURAL_KEYS } from "./natural-keys";
import { TABLES } from "./table-registry";
import type { ExportedFile } from "./manifest";

export type ImportOptions = {
  /** Apply the people tables if the bundle has them. Defaults to true —
   *  the bundle itself is the opt-in (it only contains people tables when
   *  the export was run with includePeople). */
  includePeople?: boolean;
};

export type ImportResult = { ok: true; counts: Record<string, number> } | { ok: false; error: string };

/**
 * Upserts a bundle's tables in FK-safe order (CORE_TABLES, then PEOPLE_TABLES
 * if present) using each table's natural key from NATURAL_KEYS, then restores
 * every file into storage. Idempotent — re-running overwrites by natural key,
 * never duplicates.
 *
 * Validation is intentionally minimal (see build brief): reusing the full
 * per-block-type zod registry here would mean re-deriving editor validation
 * outside its own module, so this only guards the two cheap, universal
 * invariants — the manifest format tag, and that a row has every natural-key
 * column populated (a row missing its key can't be matched OR safely
 * inserted, and would otherwise surface as a confusing NOT NULL DB error).
 */
export async function applySiteImport(
  bundle: SiteContent,
  files: ExportedFile[],
  opts: ImportOptions = {},
): Promise<ImportResult> {
  if (bundle.manifest.format !== BUNDLE_FORMAT) {
    return { ok: false, error: `Unsupported bundle format: ${bundle.manifest.format}` };
  }

  const includePeople = opts.includePeople ?? true;
  const tableNames = includePeople ? [...CORE_TABLES, ...PEOPLE_TABLES] : CORE_TABLES;
  const counts: Record<string, number> = {};

  for (const name of tableNames) {
    const rows = bundle.tables[name] as Array<Record<string, unknown>> | undefined;
    if (!rows || rows.length === 0) {
      counts[name] = 0;
      continue;
    }
    const key = NATURAL_KEYS[name];
    const keyColumns = key.kind === "column" ? [key.column] : key.columns;
    for (const row of rows) {
      if (keyColumns.some((col) => row[col] === undefined || row[col] === null)) {
        return { ok: false, error: `Row in "${name}" is missing its natural key (${keyColumns.join(", ")})` };
      }
    }
    await upsertRows(name, keyColumns, rows);
    counts[name] = rows.length;
  }

  await restoreFiles(bundle.tables.media as Array<{ storageKey: string; mime: string }> | undefined, files);

  return { ok: true, counts };
}

/**
 * Generic upsert: insert every row, falling back to an update on the
 * natural-key conflict. Drizzle's `onConflictDoUpdate` needs concrete column
 * references for `target`/`set`, which don't exist at compile time for a
 * table picked at runtime — this isolated `as never`/index-access boundary is
 * the price of one generic function instead of 23 hand-written upserts.
 */
async function upsertRows(
  name: keyof typeof TABLES,
  keyColumns: string[],
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  const table = TABLES[name] as unknown as Record<string, unknown>;
  const target = keyColumns.map((c) => table[c]);
  for (const row of rows) {
    const setClause = { ...row };
    await db
      .insert(table as never)
      .values(row as never)
      .onConflictDoUpdate({ target: target as never, set: setClause as never });
  }
}

/** Restores each media row's bytes into storage via storage.put(key, bytes, mime). */
async function restoreFiles(
  mediaRows: Array<{ storageKey: string; mime: string }> | undefined,
  files: ExportedFile[],
): Promise<void> {
  if (!mediaRows) return;
  const byKey = new Map(files.map((f) => [f.key, f.bytes]));
  for (const row of mediaRows) {
    const bytes = byKey.get(row.storageKey);
    if (!bytes) continue; // manifest referenced a file the archive didn't include — skip, don't fail the import
    await storage.put(row.storageKey, bytes, row.mime);
  }
}
