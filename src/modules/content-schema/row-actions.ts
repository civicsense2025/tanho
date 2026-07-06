"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db/client";
import { slugify } from "@/lib/slug";
import { recordSlugChange } from "@/modules/seo";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { customTypes, type CustomTypeRow } from "@/modules/custom-types/schema";
import { indexContentRow, reindexContentType, removeContentRow } from "@/modules/search/index-document";
import {
  deleteRow,
  getRowById,
  getRowByPath,
  insertRow,
  listDescendantRows,
  listRows,
  updateRow,
  type ContentRow,
} from "./crud";
import { rowValuesFromInput } from "./coerce";
import { computeRowPath } from "./paths";

/**
 * CRUD for the ROW DATA of a table-backed content type (the actual products /
 * posts / whatever), as opposed to the type's schema (content-schema/actions.ts).
 * Values are coerced to their column's storage shape per FieldKind, a stable
 * `id`/`slug`/timestamps spine is maintained, and the search index is kept in
 * sync (index on publish, remove on delete/unpublish). Owner/editor only.
 */
type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function requireTableBackedType(
  id: string,
): Promise<{ type: CustomTypeRow & { tableName: string } } | { ok: false; error: string }> {
  const type = await db.query.customTypes.findFirst({ where: eq(customTypes.id, id) });
  if (!type) return { ok: false, error: "Content type not found" };
  if (!type.tableName) return { ok: false, error: "This content type is not table-backed" };
  return { type: type as CustomTypeRow & { tableName: string } };
}

const bustRows = (typeId: string) => updateTag(`content-type-rows:${typeId}`);

/**
 * Create a row. `slug` defaults from the input's slug field or a slugified
 * title; must be unique within the type. Indexes into search immediately if
 * created as published.
 */
export async function createRow(typeId: string, input: Record<string, unknown>): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const found = await requireTableBackedType(typeId);
  if ("ok" in found) return found;
  const { type } = found;

  const title = String(input.title ?? "").trim();
  const rawSlug = String(input.slug ?? "").trim() || slugify(title);
  if (!rawSlug) return { ok: false, error: "A slug (or title to derive one) is required" };

  const now = Date.now();
  const id = createId();
  const status = input.status === "published" ? "published" : "draft";
  // Nesting: a hierarchical type may set parent_id; compute the materialized
  // full path (the routing key) from the permalink pattern + parent chain.
  const parentId =
    type.isHierarchical && typeof input.parent_id === "string" && input.parent_id ? input.parent_id : null;
  const path = await computeRowPath(type, rawSlug, parentId);

  // Uniqueness is on the PATH, not the bare slug: a hierarchical type may reuse
  // the same leaf slug under different parents (e.g. two `.../overview` pages).
  // Two rows resolving to the same URL is the real conflict.
  if (await getRowByPath(type.tableName, path)) {
    return { ok: false, error: `A row already exists at "${path}"` };
  }
  const values: ContentRow = {
    id,
    slug: rawSlug,
    title,
    status,
    sort_order: typeof input.sort_order === "number" ? input.sort_order : 0,
    parent_id: parentId,
    path,
    created_at: now,
    updated_at: now,
    ...rowValuesFromInput(type.fields, input),
  };
  await insertRow(type.tableName, values);

  if (status === "published") await indexContentRow(type, values);
  bustRows(type.id);
  await writeAudit({ userId: user.id, action: "content_row.create", ownerType: "custom_type", ownerId: type.id });
  return { ok: true, data: { id } };
}

/** Update a row by id. Re-indexes (published) or removes (unpublished) as needed. */
export async function updateRowData(
  typeId: string,
  rowId: string,
  input: Record<string, unknown>,
): Promise<Result> {
  const user = await requireUser();
  const found = await requireTableBackedType(typeId);
  if ("ok" in found) return found;
  const { type } = found;

  // Capture the pre-update slug + path so a rename becomes a 301 (and cascades
  // to descendants when this row has children).
  const before = await rowById(type.tableName, rowId);
  const oldSlug = before ? String(before.slug ?? "") : "";
  const oldPath = before ? String(before.path ?? "") : "";
  const oldParent = before ? (before.parent_id as string | null) ?? null : null;

  const values: ContentRow = { updated_at: Date.now(), ...rowValuesFromInput(type.fields, input) };
  if (typeof input.title === "string") values.title = input.title.trim();
  if (typeof input.sort_order === "number") values.sort_order = input.sort_order;
  // A hierarchical type may re-parent a row; recompute its path from the
  // (possibly new) slug + parent.
  const newParent =
    type.isHierarchical && "parent_id" in input
      ? (typeof input.parent_id === "string" && input.parent_id ? input.parent_id : null)
      : oldParent;
  const newSlug = typeof input.slug === "string" && input.slug ? input.slug : oldSlug;
  const newPath = await computeRowPath(type, newSlug, newParent);
  if (newParent !== oldParent) values.parent_id = newParent;
  if (newPath !== oldPath) values.path = newPath;
  await updateRow(type.tableName, rowId, values);

  // Path changed → move descendants + record 301s for this row and each one.
  if (oldPath && newPath && oldPath !== newPath) {
    await cascadePathChange(type, rowId, oldPath, newPath);
  }

  // Re-read to reindex with the row's canonical slug/title/status.
  const row = await rowById(type.tableName, rowId);
  if (row) {
    if (row.status === "published") await indexContentRow(type, row);
    else await removeContentRow(type, String(row.slug ?? ""));
  }
  bustRows(type.id);
  await writeAudit({ userId: user.id, action: "content_row.update", ownerType: "custom_type", ownerId: type.id });
  return { ok: true };
}

/** Publish/unpublish a row: flips status, then indexes or de-indexes it. */
export async function setRowStatus(
  typeId: string,
  rowId: string,
  status: "draft" | "published",
): Promise<Result> {
  const user = await requireUser();
  const found = await requireTableBackedType(typeId);
  if ("ok" in found) return found;
  const { type } = found;

  await updateRow(type.tableName, rowId, { status, updated_at: Date.now() });
  const row = await rowById(type.tableName, rowId);
  if (row) {
    if (status === "published") await indexContentRow(type, row);
    else await removeContentRow(type, String(row.slug ?? ""));
  }
  bustRows(type.id);
  await writeAudit({ userId: user.id, action: "content_row.status", ownerType: "custom_type", ownerId: type.id });
  return { ok: true };
}

/** Delete a row + remove it from the search index. */
export async function deleteRowData(typeId: string, rowId: string): Promise<Result> {
  const user = await requireUser();
  const found = await requireTableBackedType(typeId);
  if ("ok" in found) return found;
  const { type } = found;

  const row = await rowById(type.tableName, rowId);
  await deleteRow(type.tableName, rowId);
  if (row) await removeContentRow(type, String(row.slug ?? ""));
  bustRows(type.id);
  await writeAudit({ userId: user.id, action: "content_row.delete", ownerType: "custom_type", ownerId: type.id });
  return { ok: true };
}

/** Rebuild the search index for every published row of a type (manual "Sync"). */
export async function syncTypeSearchIndex(typeId: string): Promise<Result<{ indexed: number }>> {
  const user = await requireUser("owner");
  const found = await requireTableBackedType(typeId);
  if ("ok" in found) return found;
  const { type } = found;

  const rows = await listRows(type.tableName, { onlyPublished: true });
  await reindexContentType(type, rows);
  await writeAudit({ userId: user.id, action: "content_row.sync", ownerType: "custom_type", ownerId: type.id });
  return { ok: true, data: { indexed: rows.length } };
}

/** One row by id (admin edit load) — no published filter. Indexed lookup. */
export async function rowById(tableName: string, rowId: string): Promise<ContentRow | null> {
  return getRowById(tableName, rowId);
}

/**
 * A row's `path` changed (its slug or parent moved). Move every DESCENDANT's
 * materialized path (prefix rewrite: oldPath → newPath) and record a 301 for the
 * moved row and each descendant, so no published URL under the moved subtree
 * breaks. Only published rows get a redirect (drafts have no public URL);
 * descendant paths are always rewritten so routing stays correct. Identity moves
 * are skipped by recordSlugChange itself.
 */
async function cascadePathChange(
  type: CustomTypeRow & { tableName: string },
  movedRowId: string,
  oldPath: string,
  newPath: string,
): Promise<void> {
  // 1. The moved row itself.
  const moved = await getRowById(type.tableName, movedRowId);
  if (moved?.status === "published") {
    await recordSlugChange("content-row", movedRowId, oldPath, newPath);
  }

  // 2. Descendants: every row under the old subtree (UNCAPPED — a capped read
  //    would leave descendants past the cap with stale paths). Rewrite the path
  //    prefix and (for published rows) 301 the old descendant URL → the new one.
  const descendants = await listDescendantRows(type.tableName, oldPath);
  for (const r of descendants) {
    const p = typeof r.path === "string" ? r.path : "";
    const childNew = newPath + p.slice(oldPath.length);
    await updateRow(type.tableName, String(r.id), { path: childNew, updated_at: Date.now() });
    if (r.status === "published") {
      await recordSlugChange("content-row", String(r.id), p, childNew);
    }
  }
  updateTag("redirects");
}
