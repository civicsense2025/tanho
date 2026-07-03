import { createId } from "@paralleldrive/cuid2";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Generic content-type record. `type` selects the entity schema its `data`
 * JSON is validated against (project, guide, resource, hub, platform,
 * matrix_pair, or custom:<slug>). Page-content blocks for an entry live in
 * the shared `block_sets` table under ownerType `entry:${type}`.
 */
export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    type: text("type").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
    sortOrder: real("sort_order").notNull().default(0),
    data: text("data", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [uniqueIndex("entries_type_slug_idx").on(t.type, t.slug)],
);

export type EntryRow = typeof entries.$inferSelect;
