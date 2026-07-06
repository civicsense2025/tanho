"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { customTypes, type CustomTypeRow } from "@/modules/custom-types/schema";
import { fieldListSchema, type FieldDef } from "@/modules/custom-types/validation";
import { currentDialect } from "./dialect";
import { RESERVED_FIELD_KEYS, createTableStatements, dropTableStatement, tableNameForSlug } from "./ddl";
import { applyContentTypeChange } from "./apply";
import { tableExists } from "./introspect";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Provision a REAL table for a content type (the "content type = first-class
 * table" path). Runs `CREATE TABLE ct_<slug>` then writes the `custom_types`
 * metadata row — in that order, deliberately: raw DDL can't share a Drizzle
 * transaction, so if the metadata write fails the only residue is an orphan
 * `ct_*` table, which the reconcile action (verifyContentSchema) can drop. The
 * metadata row is the source of truth. Owner-only, audited.
 *
 * Rejects field keys that collide with the fixed spine columns (id/slug/title/
 * status/sort_order/created_at/updated_at), which every ct_* table already has.
 */
export async function createTableBackedType(input: {
  slug: string;
  name: string;
  pluralName?: string;
  fields: FieldDef[];
  titleField?: string;
  slugField?: string;
}): Promise<Result<{ id: string; tableName: string }>> {
  const user = await requireUser("owner");

  const fields = fieldListSchema.safeParse(input.fields);
  if (!fields.success) {
    return { ok: false, error: fields.error.issues[0]?.message ?? "Invalid fields" };
  }
  const reserved = fields.data.find((f) => RESERVED_FIELD_KEYS.has(f.key));
  if (reserved) {
    return { ok: false, error: `Field key "${reserved.key}" is reserved by the table's built-in columns` };
  }

  const existing = await db.query.customTypes.findFirst({ where: eq(customTypes.slug, input.slug) });
  if (existing) return { ok: false, error: `A content type with slug "${input.slug}" already exists` };

  const tableName = tableNameForSlug(input.slug);
  if (await tableExists(tableName)) {
    return { ok: false, error: `A table named "${tableName}" already exists — pick a different slug` };
  }

  // 1) DDL first.
  for (const stmt of createTableStatements(tableName, fields.data, currentDialect())) {
    await db.run(stmt);
  }

  // 2) Metadata row (source of truth).
  const [row] = await db
    .insert(customTypes)
    .values({
      slug: input.slug,
      name: input.name,
      pluralName: input.pluralName ?? input.name,
      fields: fields.data,
      tableName,
      titleField: input.titleField ?? "title",
      slugField: input.slugField ?? "slug",
      status: "draft",
      updatedAt: Date.now(),
    })
    .returning();

  updateTag("custom_types");
  await writeAudit({ userId: user.id, action: "content_type.create", ownerType: "custom_type", ownerId: row.id });
  return { ok: true, data: { id: row.id, tableName } };
}

/**
 * Apply a field-definition change to a table-backed type: diff old→new fields
 * into the minimal ALTER sequence, run it, then update the metadata row.
 * `dropsData` (columns whose data the change discards) is returned so the
 * caller can require an explicit confirm before a destructive change.
 */
export async function updateTableBackedTypeSchema(
  id: string,
  nextFields: FieldDef[],
  opts: { confirmDataLoss?: boolean } = {},
): Promise<Result<{ droppedColumns: string[] }>> {
  const user = await requireUser("owner");
  const type = await requireTableBacked(id);
  if ("error" in type) return type;

  const parsed = fieldListSchema.safeParse(nextFields);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid fields" };
  const reserved = parsed.data.find((f) => RESERVED_FIELD_KEYS.has(f.key));
  if (reserved) {
    return { ok: false, error: `Field key "${reserved.key}" is reserved by the table's built-in columns` };
  }

  const change = applyContentTypeChange(type.row.tableName!, type.row.fields, parsed.data, currentDialect());
  if (change.dropsData.length > 0 && !opts.confirmDataLoss) {
    return {
      ok: false,
      error: `This change drops data in: ${change.dropsData.join(", ")}. Re-submit with confirmation to proceed.`,
    };
  }

  for (const stmt of change.statements) await db.run(stmt);

  await db
    .update(customTypes)
    .set({ fields: parsed.data, updatedAt: Date.now() })
    .where(eq(customTypes.id, id));

  updateTag("custom_types");
  await writeAudit({ userId: user.id, action: "content_type.alter", ownerType: "custom_type", ownerId: id });
  return { ok: true, data: { droppedColumns: change.dropsData } };
}

/**
 * Delete a table-backed type: DROP its table, then delete the metadata row.
 * Guard: refuses while the type is published (owns live public routes) unless
 * `force`. Owner-only, audited.
 */
export async function deleteTableBackedType(id: string, opts: { force?: boolean } = {}): Promise<Result> {
  const user = await requireUser("owner");
  const type = await requireTableBacked(id);
  if ("error" in type) return type;

  if (type.row.status === "published" && !opts.force) {
    return { ok: false, error: "This content type is published. Unpublish it first, or force-delete." };
  }

  if (await tableExists(type.row.tableName!)) {
    await db.run(dropTableStatement(type.row.tableName!));
  }
  await db.delete(customTypes).where(eq(customTypes.id, id));

  updateTag("custom_types");
  await writeAudit({ userId: user.id, action: "content_type.delete", ownerType: "custom_type", ownerId: id });
  return { ok: true };
}

/**
 * Reconcile the content-schema's parallel migration lane: for every
 * table-backed type, confirm its `ct_*` table exists and carries a column for
 * every field. Reports drift (missing table, or fields with no column) so an
 * owner can repair it — the safety net for the fact that `ct_*` tables live
 * outside drizzle/*.sql. Read-only; owner-only.
 */
export async function verifyContentSchema(): Promise<
  Result<{ drift: Array<{ id: string; slug: string; issue: string }> }>
> {
  await requireUser("owner");
  const { tableColumns } = await import("./introspect");
  const types = await db.query.customTypes.findMany();
  const drift: Array<{ id: string; slug: string; issue: string }> = [];
  for (const t of types) {
    if (!t.tableName) continue;
    if (!(await tableExists(t.tableName))) {
      drift.push({ id: t.id, slug: t.slug, issue: `table ${t.tableName} is missing` });
      continue;
    }
    const cols = new Set(await tableColumns(t.tableName));
    const missing = t.fields.map((f) => f.key).filter((k) => !cols.has(k));
    if (missing.length > 0) {
      drift.push({ id: t.id, slug: t.slug, issue: `columns missing: ${missing.join(", ")}` });
    }
  }
  return { ok: true, data: { drift } };
}

/** Load a type and assert it is table-backed (has a `tableName`). */
async function requireTableBacked(
  id: string,
): Promise<{ row: CustomTypeRow & { tableName: string } } | { ok: false; error: string }> {
  const row = await db.query.customTypes.findFirst({ where: eq(customTypes.id, id) });
  if (!row) return { ok: false, error: "Content type not found" };
  if (!row.tableName) return { ok: false, error: "This content type is not table-backed" };
  return { row: row as CustomTypeRow & { tableName: string } };
}
