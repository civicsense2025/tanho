import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * URL redirects, checked first in the public catch-all router. `fromPath` is a
 * unique relative path (e.g. /old-url); `toPath` is a relative same-origin
 * target (validated on write AND re-checked at redirect time — no open
 * redirects). `code` is the HTTP status: 301 permanent or 302 temporary.
 */
export const redirects = sqliteTable("redirects", {
  id: text("id").primaryKey().$defaultFn(createId),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
  code: integer("code").notNull().default(301),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
