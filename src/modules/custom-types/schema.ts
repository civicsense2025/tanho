import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { FieldDef } from "./validation";

/**
 * A user-defined content type. `slug` becomes the entry type `custom:<slug>`;
 * `fields` is the validated field-definition list (its shape is owned by the
 * meta-schema in validation.ts — writes must go through saveCustomType).
 *
 * When `tableName` is set, the type is backed by a REAL runtime-created table
 * (`ct_<slug>`, see src/modules/content-schema) — one column per field — rather
 * than the shared `entries`+JSON store. `basePath`/`pluralName`/`status` +
 * `titleField`/`slugField` drive its public route pages (src/modules/content-pages).
 * All of these are nullable so pre-existing custom types (no real table, no
 * public pages) keep working unchanged.
 */
export const customTypes = sqliteTable("custom_types", {
  id: text("id").primaryKey().$defaultFn(createId),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  fields: text("fields", { mode: "json" }).$type<FieldDef[]>().notNull().default([]),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  /** Physical `ct_<slug>` table backing this type, or null for legacy JSON-backed types. */
  tableName: text("table_name"),
  /** Public route base, e.g. "/products" — null = no public pages. */
  basePath: text("base_path"),
  /** Plural label for the index page / listings. */
  pluralName: text("plural_name"),
  /** Gates public routes: only "published" types render publicly. */
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  /** Field key used as the row's page/list title. */
  titleField: text("title_field"),
  /** Field key used as the per-row URL slug segment. */
  slugField: text("slug_field"),
  /**
   * URL template (pattern-as-data). `{base}/{slug}` = flat (default, today's
   * behavior); `{base}/{parent_path}/{slug}` = nested. Resolved to a concrete
   * `path` per row at write time. Placeholders: {base} {slug} {parent_path}.
   */
  permalinkPattern: text("permalink_pattern").notNull().default("{base}/{slug}"),
  /** Whether rows may nest under a parent (unbounded depth). Off = flat. */
  isHierarchical: integer("is_hierarchical", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type CustomTypeRow = typeof customTypes.$inferSelect;
