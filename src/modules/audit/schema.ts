import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Append-only trail of every admin mutation. */
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey().$defaultFn(createId),
  at: integer("at")
    .notNull()
    .$defaultFn(() => Date.now()),
  userId: text("user_id"),
  action: text("action").notNull(),
  ownerType: text("owner_type"),
  ownerId: text("owner_id"),
  meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
});
