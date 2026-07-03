import { createId } from "@paralleldrive/cuid2";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Structured page fields — the "DB half" of the two-save separation. */
export const pages = sqliteTable("pages", {
  id: text("id").primaryKey().$defaultFn(createId),
  slug: text("slug").notNull().unique(),
  route: text("route").notNull().unique(),
  title: text("title").notNull(),
  kind: text("kind", { enum: ["page", "post"] }).notNull().default("page"),
  parentId: text("parent_id"),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  sortOrder: real("sort_order").notNull().default(0),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  priority: integer("priority").notNull().default(3),
  template: text("template").notNull().default("blank"),
  layout: text("layout", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  ogImageMediaId: text("og_image_media_id"),
  canonicalUrl: text("canonical_url").notNull().default(""),
  noIndex: integer("no_index", { mode: "boolean" }).notNull().default(false),
  hasPaywall: integer("has_paywall", { mode: "boolean" }).notNull().default(false),
  publishedAt: integer("published_at"),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Block trees — the "content half". One row per (owner, variant):
 * draft is what the editor writes; published is the visitor snapshot.
 * Publish copies draft → published.
 */
export const blockSets = sqliteTable(
  "block_sets",
  {
    ownerType: text("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
    variant: text("variant", { enum: ["draft", "published"] }).notNull(),
    blocks: text("blocks", { mode: "json" }).$type<unknown[]>().notNull().default([]),
    version: integer("version").notNull().default(1),
    savedAt: integer("saved_at")
      .notNull()
      .$defaultFn(() => Date.now()),
    savedBy: text("saved_by"),
  },
  (t) => [primaryKey({ columns: [t.ownerType, t.ownerId, t.variant] })],
);
