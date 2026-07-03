import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { BlockCategory } from "@/blocks/types";

/**
 * DB-backed block registry — the metadata half of "which blocks exist." The
 * executable half (zod `schema`, `Render`, `make`) stays compiled in
 * `src/blocks/registry.ts`, keyed by `type`. This table holds the tunable
 * metadata (label/icon/blurb/category), provenance (`source`), the on/off
 * switch (`enabled`), and a `version` for future plugin/upgrade flows.
 *
 * Phase 1: every row points at a compiled block type (seeded from the defs in
 * `src/blocks/registry.ts`). A row whose `type` has no compiled def renders as
 * a graceful "unsupported block" placeholder (see BlockRenderer) — so an
 * imported pack that references a type this install lacks never breaks the
 * site. Phase 2 will add a plugin loader for `source: "plugin"` rows.
 *
 * `builtin` rows ship with the platform and can't be deleted (only disabled).
 */
export const blockRegistry = sqliteTable("block_registry", {
  type: text("type").primaryKey(),
  category: text("category").$type<BlockCategory>().notNull(),
  label: text("label").notNull(),
  icon: text("icon").notNull(),
  blurb: text("blurb").notNull().default(""),
  source: text("source", { enum: ["builtin", "imported", "plugin"] })
    .notNull()
    .default("builtin"),
  builtin: integer("builtin", { mode: "boolean" }).notNull().default(true),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  /** Schema/contract version for the block type — bump on breaking content
   *  shape changes so future imports can migrate or reject gracefully. */
  version: integer("version").notNull().default(1),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type BlockRegistryRow = typeof blockRegistry.$inferSelect;
