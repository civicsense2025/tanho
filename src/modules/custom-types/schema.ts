import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { FieldDef } from "./validation";

/**
 * A user-defined content type. `slug` becomes the entry type `custom:<slug>`;
 * `fields` is the validated field-definition list (its shape is owned by the
 * meta-schema in validation.ts — writes must go through saveCustomType).
 */
export const customTypes = sqliteTable("custom_types", {
  id: text("id").primaryKey().$defaultFn(createId),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  fields: text("fields", { mode: "json" }).$type<FieldDef[]>().notNull().default([]),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type CustomTypeRow = typeof customTypes.$inferSelect;
