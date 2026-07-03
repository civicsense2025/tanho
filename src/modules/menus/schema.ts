import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Named navigation menus (header nav, footer columns, social links…).
 * `items` is a small nested JSON tree — nothing queries across items, so
 * JSON wins over a relational table. The shape is owned by the zod schema
 * in validation.ts; every write goes through it.
 */
export const menus = sqliteTable("menus", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  items: text("items", { mode: "json" }).$type<unknown[]>().notNull().default([]),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
