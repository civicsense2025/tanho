import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import type { BlockCategory, BlockNode } from "@/blocks/types";

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

/**
 * Saved reusable content blocks — GLOBAL SYMBOLS (Figma/Webflow-Components model).
 *
 * A `symbol` block instance on a page carries only `{ symbolId }` (+ optional
 * per-instance overrides); the actual block tree lives here, keyed by `id`. The
 * render walker (BlockRenderer) expands an instance to this `blockTree` at render
 * time — so editing one symbol updates every instance (linked, edit-once). A
 * dedicated table (not `blockSets`, which is document-per-owner) because instances
 * resolve a symbol by id on EVERY page render across many pages: `id` is a join key.
 *
 * `blockTree` is stored VALIDATED (validateBlockTree output). Symbol nodes may
 * appear inside it (nested symbols); cycle/depth safety is a render + save-time
 * concern, not a storage one. `version` bumps on every definition edit (for cache
 * invalidation + override-drift UX); instances are LINKED and never pin a version.
 */
export const symbols = sqliteTable("symbols", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  category: text("category").$type<BlockCategory>().notNull().default("content"),
  icon: text("icon").notNull().default("component"),
  blockTree: text("block_tree", { mode: "json" }).$type<BlockNode[]>().notNull().default([]),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type SymbolRow = typeof symbols.$inferSelect;
