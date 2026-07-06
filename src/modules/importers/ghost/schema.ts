import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * A safety receipt for one completed import — the auditable artifact that
 * replaces "trust me" with "verify it yourself" before relying on the
 * imported content. `source` is extensible to future platforms beyond Ghost.
 */
export const importReceipts = sqliteTable("import_receipts", {
  id: text("id").primaryKey().$defaultFn(createId),
  source: text("source").notNull(),
  importedAt: integer("imported_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  tableCounts: text("table_counts", { mode: "json" })
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  peopleCountBefore: integer("people_count_before").notNull().default(0),
  peopleCountAfter: integer("people_count_after").notNull().default(0),
  membershipCountBefore: integer("membership_count_before").notNull().default(0),
  membershipCountAfter: integer("membership_count_after").notNull().default(0),
  redirectStatuses: text("redirect_statuses", { mode: "json" })
    .$type<Array<{ fromPath: string; toPath: string; status: "resolved" | "broken" }>>()
    .notNull()
    .default([]),
  unmapped: text("unmapped", { mode: "json" })
    .$type<Array<{ kind: string; detail: string }>>()
    .notNull()
    .default([]),
});

export type ImportReceiptRow = typeof importReceipts.$inferSelect;
