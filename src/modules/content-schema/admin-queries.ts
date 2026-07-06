import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customTypes, type CustomTypeRow } from "@/modules/custom-types/schema";
import { listRows, type ContentRow } from "./crud";

/**
 * Admin-side (uncached — the admin panel is dynamic) loads for the row-editor
 * screen: the table-backed type plus all its rows, drafts included. Public
 * reads go through the cached queries.ts instead.
 */
export type TableBackedTypeRow = CustomTypeRow & { tableName: string };

function isTableBacked(row: CustomTypeRow | undefined): row is TableBackedTypeRow {
  return !!row && !!row.tableName;
}

/** A table-backed type by id, or null (also null for legacy JSON types). */
export async function getTableBackedType(id: string): Promise<TableBackedTypeRow | null> {
  const row = await db.query.customTypes.findFirst({ where: eq(customTypes.id, id) });
  return isTableBacked(row) ? row : null;
}

/** All rows (draft + published) of a table-backed type, for the admin list. */
export async function listTypeRowsForAdmin(type: TableBackedTypeRow): Promise<ContentRow[]> {
  return listRows(type.tableName, { limit: 500 });
}

/**
 * A representative row for the template editor's `{{field}}` canvas preview:
 * the first real row if any exist, else a SYNTHETIC row built from the type's
 * field keys (a readable placeholder per field) so the owner still previews
 * real-looking data before adding any rows. Returns null only if the type has
 * neither rows nor fields.
 */
export async function getSampleRow(type: TableBackedTypeRow): Promise<Record<string, unknown> | null> {
  const rows = await listRows(type.tableName, { limit: 1 });
  if (rows[0]) return rows[0];

  if (type.fields.length === 0) return null;
  const synthetic: Record<string, unknown> = {
    title: `Sample ${type.name}`,
    slug: "sample",
  };
  for (const f of type.fields) {
    if (f.key in synthetic) continue;
    synthetic[f.key] =
      f.kind === "number" || f.kind === "currency"
        ? 42
        : f.kind === "boolean"
          ? true
          : `Sample ${f.label.toLowerCase()}`;
  }
  return synthetic;
}
