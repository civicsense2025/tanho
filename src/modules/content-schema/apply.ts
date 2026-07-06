import type { SQL } from "drizzle-orm";
import type { FieldDef } from "@/modules/custom-types/validation";
import { addColumnStatement, columnType, dropColumnStatement } from "./ddl";
import type { Dialect } from "./dialect";

/**
 * Diff two field-definition lists into the minimal DDL needed to migrate a
 * content type's `ct_*` table from `prev` to `next`.
 *
 * Fields are matched by `key` (their column name) — the only stable handle a
 * FieldDef carries. So:
 *   - key in next, not in prev            → ADD COLUMN
 *   - key in prev, not in next            → DROP COLUMN (data in it is lost)
 *   - key in both, DIFFERENT column type  → DROP + ADD (retype; column data
 *                                            lost — SQLite has no ALTER COLUMN
 *                                            TYPE, and a lossy cast is worse
 *                                            than an explicit reset)
 *   - key in both, same column type       → no-op (label/help/etc. are
 *                                            metadata-only, no schema change)
 *
 * A pure RENAME can't be inferred from key-set alone (a rename looks identical
 * to a drop+add), so it is NOT auto-detected here — an explicit rename is a
 * separate operation (renameColumnStatement) driven by a future UI that maps
 * old→new. This keeps the automatic path unambiguous and never silently moves
 * data between columns.
 *
 * The returned `statements` run in order; `dropsData` lists columns whose data
 * the change discards, so the caller can surface a confirm.
 */
export type ContentTypeChange = {
  statements: SQL[];
  /** Column keys whose existing data is dropped (removed or retyped fields). */
  dropsData: string[];
};

export function applyContentTypeChange(
  tableName: string,
  prev: FieldDef[],
  next: FieldDef[],
  dialect: Dialect,
): ContentTypeChange {
  const prevByKey = new Map(prev.map((f) => [f.key, f]));
  const nextByKey = new Map(next.map((f) => [f.key, f]));

  const statements: SQL[] = [];
  const dropsData: string[] = [];

  // Drops and retypes: iterate prev so removed/changed columns come first
  // (dropping before re-adding a retyped column of the same name is required).
  for (const [key, prevField] of prevByKey) {
    const nextField = nextByKey.get(key);
    if (!nextField) {
      statements.push(dropColumnStatement(tableName, key));
      dropsData.push(key);
      continue;
    }
    if (columnType(prevField, dialect) !== columnType(nextField, dialect)) {
      // Retype = drop then add (SQLite can't ALTER COLUMN TYPE; a real cast is
      // out of scope and lossy). The re-add happens in the ADD pass below.
      statements.push(dropColumnStatement(tableName, key));
      dropsData.push(key);
    }
  }

  // Adds: brand-new fields, plus the re-add half of any retype.
  for (const [key, nextField] of nextByKey) {
    const prevField = prevByKey.get(key);
    const isNew = !prevField;
    const isRetype =
      prevField !== undefined &&
      columnType(prevField, dialect) !== columnType(nextField, dialect);
    if (isNew || isRetype) {
      statements.push(addColumnStatement(tableName, nextField, dialect));
    }
  }

  return { statements, dropsData };
}
