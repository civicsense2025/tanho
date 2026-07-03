import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Legal / policy documents — Privacy, Terms, Cookies (site group) and the
 * store policies (Shipping, Returns, …). Body is plain markdown-ish text,
 * sanitised on render. `footerLinked` policies surface in the footer legal
 * row; only `published` ones render publicly at /policies/:slug.
 */
export const policies = sqliteTable("policies", {
  id: text("id").primaryKey().$defaultFn(createId),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  group: text("group", { enum: ["site", "store"] }).notNull().default("site"),
  body: text("body").notNull().default(""),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  footerLinked: integer("footer_linked", { mode: "boolean" })
    .notNull()
    .default(false),
  effectiveDate: text("effective_date").notNull().default(""),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
