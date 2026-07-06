import { createId } from "@paralleldrive/cuid2";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { ThemeInput } from "./validation";

/**
 * Singleton theme row (id is always "theme"). ~12 scalars from which the
 * entire light+dark token set is derived at render — see derive.ts.
 */
export const theme = sqliteTable("theme", {
  id: text("id").primaryKey().default("theme"),
  accent: text("accent").notNull(),
  accent2: text("accent2").notNull(),
  ink: text("ink").notNull(),
  paper: text("paper").notNull(),
  font: text("font").notNull().default("geist"),
  baseSize: real("base_size").notNull().default(16),
  headingScale: real("heading_scale").notNull().default(1),
  leading: real("leading").notNull().default(1.6),
  density: real("density").notNull().default(1),
  radius: text("radius").notNull().default("soft"),
  shadow: text("shadow").notNull().default("subtle"),
  /** Active custom/Google font family (font_families.id); null = use `font`. */
  fontFamilyId: text("font_family_id"),
  faviconMediaId: text("favicon_media_id"),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Saved/named themes. Each holds a full themeInputSchema payload (the ~12
 * scalars) as JSON — the portable, deployment-agnostic unit. Activating a
 * preset copies its `data` into the singleton `theme` row (which stays the one
 * source of truth the renderer reads). `source` tracks provenance; `builtin`
 * marks the shipped starter themes (not deletable).
 */
export const themePresets = sqliteTable("theme_presets", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  data: text("data", { mode: "json" }).notNull().$type<ThemeInput>(),
  source: text("source", { enum: ["local", "imported", "library"] })
    .notNull()
    .default("local"),
  builtin: integer("builtin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
