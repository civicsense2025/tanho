import { createId } from "@paralleldrive/cuid2";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { LICENSE_IDS } from "./licenses";

/**
 * One row per uploaded asset. `storageKey` is the server-generated file
 * key (`${cuid2}.${ext}`); `name` is the sanitized original filename and
 * is display-only — it never touches the filesystem.
 */
export const media = sqliteTable("media", {
  id: text("id").primaryKey().$defaultFn(createId),
  storageKey: text("storage_key").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["image", "video", "doc", "font"] }).notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  w: integer("w"),
  h: integer("h"),
  alt: text("alt").notNull().default(""),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  credit: text("credit").notNull().default(""),
  source: text("source").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  license: text("license", { enum: LICENSE_IDS }).notNull().default("unknown"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Where each asset is referenced — rebuilt from published block trees by
 * rebuildMediaUsage (usage.ts). `whereLabel` is the referencing block type;
 * `route` is the owner's public route for jump-to links.
 */
export const mediaUsage = sqliteTable(
  "media_usage",
  {
    mediaId: text("media_id").notNull(),
    ownerType: text("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
    whereLabel: text("where_label").notNull(),
    route: text("route").notNull(),
  },
  (t) => [primaryKey({ columns: [t.mediaId, t.ownerType, t.ownerId, t.whereLabel] })],
);
