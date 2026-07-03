import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * One row per settings namespace (general, seo, header, footer, …).
 * The JSON shape of `data` is owned by each namespace's zod schema in
 * validation.ts — writes must always go through it.
 */
export const settings = sqliteTable("settings", {
  namespace: text("namespace").primaryKey(),
  data: text("data", { mode: "json" }).notNull().$type<unknown>(),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
