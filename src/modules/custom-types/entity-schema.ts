import type { AnyEntitySchema, ListColumn } from "@/entities/types";
import { buildZodForFields } from "./builder";
import type { CustomTypeRow } from "./schema";

const MAX_LIST_COLUMNS = 4;

/** Picks the first few non-repeater fields as admin-grid columns — repeaters don't render as a flat cell value. */
function listColumnsForFields(row: CustomTypeRow): ListColumn[] {
  return row.fields
    .filter((f) => f.kind !== "repeater")
    .slice(0, MAX_LIST_COLUMNS)
    .map((f) => ({ key: f.key, header: f.label }));
}

/**
 * Builds a full `AnyEntitySchema` for one DB-defined custom type, on the
 * fly — this is the "Phase 5" bridge `entities/registry.ts` anticipated.
 * Never registered into the static registry Map; `getEntitySchema` calls
 * this fresh (via the cached `getEnabledCustomTypes()`) on every lookup, so
 * there's no stale-entry cleanup or shared-mutable-state risk when a custom
 * type is edited or deleted while the app is running.
 */
export function buildEntitySchemaForCustomType(row: CustomTypeRow): AnyEntitySchema {
  return {
    entity: `custom:${row.slug}`,
    label: row.name,
    plural: row.name,
    // No dedicated public page template yet — just a stable, non-crashing
    // route prefix for publishEntryBlocks/sitemap to interpolate.
    basePath: `/custom/${row.slug}`,
    dataSchema: buildZodForFields(row.fields),
    listColumns: listColumnsForFields(row),
  };
}
