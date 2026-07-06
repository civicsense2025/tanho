"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { customTypes, type CustomTypeRow } from "../schema";
import { baseCollision } from "@/modules/content-schema/reserved-routes";

/**
 * Admin-only wrappers over the content-schema layer for the two concerns the
 * DDL actions deliberately don't own: a table-backed type's public **base
 * path** and its **publish status**. Both are metadata-only (no DDL), so they
 * live here rather than in content-schema/actions.ts, and both validate the
 * base path with `baseCollision` (the superset reserved-route guard) before it
 * can shadow a route. Owner-only, audited, cache-invalidated the same way the
 * content-schema actions are (`updateTag("custom_types")` + the per-base /
 * per-type tags that content-schema/queries.ts reads).
 */

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Normalize a raw base-path input to a single leading-slash segment ("/products"). */
function normalizeBase(raw: string): string {
  const segment = raw.trim().replace(/^\/+|\/+$/g, "").split("/")[0] ?? "";
  return segment ? `/${segment.toLowerCase()}` : "";
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

/** Bust every cache tag that gates a table-backed type's public routes. */
function invalidate(row: CustomTypeRow) {
  updateTag("custom_types");
  if (row.basePath) updateTag(`content-type:${row.basePath}`);
  updateTag(`content-type-rows:${row.id}`);
}

/**
 * Set (or clear) a table-backed type's public base path. Validates the base
 * with `baseCollision` — rejecting code pages, built-in sections, /shop,
 * /search, a published CMS page, or another type's base — before writing it.
 * Pass an empty string to unset the base (which also can't stay published, so
 * we force it back to draft).
 */
export async function setTableBackedBasePath(id: string, rawBase: string): Promise<Result> {
  const user = await requireUser("owner");
  const type = await requireTableBacked(id);
  if ("error" in type) return type;

  const base = normalizeBase(rawBase);
  if (base) {
    const collision = await baseCollision(base, id);
    if (collision) return { ok: false, error: collision };
  }

  const oldBase = type.row.basePath;
  await db
    .update(customTypes)
    .set({
      basePath: base || null,
      // A type with no base can't be publicly routed — drop it to draft.
      ...(base ? {} : { status: "draft" as const }),
      updatedAt: Date.now(),
    })
    .where(eq(customTypes.id, id));

  invalidate(type.row);
  if (oldBase && oldBase !== base) updateTag(`content-type:${oldBase}`);
  await writeAudit({ userId: user.id, action: "content_type.set_base_path", ownerType: "custom_type", ownerId: id });
  return { ok: true };
}

/**
 * Set a table-backed type's presentation metadata: its plural label and the
 * title/slug field pickers. These are metadata-only (no DDL) and don't affect
 * routing, so no base-path guard is needed — but the picked fields must be
 * real columns on the table (a spine column or a declared field key), which we
 * validate against the current `fields` + spine before writing.
 */
export async function setTableBackedPresentation(
  id: string,
  input: { pluralName?: string; titleField?: string; slugField?: string },
): Promise<Result> {
  const user = await requireUser("owner");
  const type = await requireTableBacked(id);
  if ("error" in type) return type;

  const validKeys = new Set<string>(["title", "slug", ...type.row.fields.map((f) => f.key)]);
  for (const [label, key] of [
    ["Title field", input.titleField],
    ["Slug field", input.slugField],
  ] as const) {
    if (key && !validKeys.has(key)) {
      return { ok: false, error: `${label} "${key}" is not a column on this type` };
    }
  }

  await db
    .update(customTypes)
    .set({
      ...(input.pluralName !== undefined ? { pluralName: input.pluralName || null } : {}),
      ...(input.titleField ? { titleField: input.titleField } : {}),
      ...(input.slugField ? { slugField: input.slugField } : {}),
      updatedAt: Date.now(),
    })
    .where(eq(customTypes.id, id));

  invalidate(type.row);
  await writeAudit({ userId: user.id, action: "content_type.set_presentation", ownerType: "custom_type", ownerId: id });
  return { ok: true };
}

/**
 * Publish or unpublish a table-backed type. Publishing is what makes its
 * public routes live (the pages layer renders published types only), so it
 * requires a base path and re-validates it with `baseCollision` at publish
 * time (a route may have been claimed since the base was set). Unpublishing is
 * always allowed.
 */
export async function setTableBackedPublished(id: string, published: boolean): Promise<Result> {
  const user = await requireUser("owner");
  const type = await requireTableBacked(id);
  if ("error" in type) return type;

  if (published) {
    const base = type.row.basePath;
    if (!base) return { ok: false, error: "Set a base path before publishing this content type." };
    const collision = await baseCollision(base, id);
    if (collision) return { ok: false, error: collision };
  }

  await db
    .update(customTypes)
    .set({ status: published ? "published" : "draft", updatedAt: Date.now() })
    .where(eq(customTypes.id, id));

  invalidate(type.row);
  await writeAudit({
    userId: user.id,
    action: published ? "content_type.publish" : "content_type.unpublish",
    ownerType: "custom_type",
    ownerId: id,
  });
  return { ok: true };
}
