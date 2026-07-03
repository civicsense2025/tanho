import { createId } from "@paralleldrive/cuid2";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** A named tag. Names are unique and case-sensitive (normalized on write). */
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Polymorphic tag assignment. `ownerType` is the tagged entity kind
 * (page, entry:project, media, …); `ownerId` its id. A tag can be applied
 * to an owner at most once (composite PK).
 */
export const taggings = sqliteTable(
  "taggings",
  {
    tagId: text("tag_id").notNull(),
    ownerType: text("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tagId, t.ownerType, t.ownerId] })],
);

export type TagRow = typeof tags.$inferSelect;
export type TaggingRow = typeof taggings.$inferSelect;
