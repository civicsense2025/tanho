import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Custom typography. A `font_families` row is one selectable typeface; its
 * `font_faces` rows are the concrete weights/styles behind it (each becomes
 * one `@font-face`). A face either points at an uploaded `media` row
 * (source "custom") or at a self-hosted Google Fonts file the platform
 * fetched and stored as media at add-time (source "google"). The active
 * family is chosen on the singleton theme (`theme.fontFamilyId`); when null,
 * the built-in `theme.font` preset stack is used instead (back-compat).
 */
export const fontFamilies = sqliteTable("font_families", {
  id: text("id").primaryKey().$defaultFn(createId),
  /** Display + CSS family name, e.g. "Inter". */
  name: text("name").notNull(),
  source: text("source", { enum: ["custom", "google"] })
    .notNull()
    .default("custom"),
  status: text("status", { enum: ["active", "disabled"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const fontFaces = sqliteTable("font_faces", {
  id: text("id").primaryKey().$defaultFn(createId),
  familyId: text("family_id").notNull(),
  /** The uploaded/self-hosted file backing this face (a media row, kind "font"). */
  mediaId: text("media_id").notNull(),
  /** CSS font-weight (100–900). A variable face uses its default/lower bound. */
  weight: integer("weight").notNull().default(400),
  style: text("style", { enum: ["normal", "italic"] })
    .notNull()
    .default("normal"),
  /** Human label shown in the fonts manager, e.g. "Bold Italic". */
  displayName: text("display_name").notNull().default(""),
  /** Optional CSS unicode-range for subsetting; empty = full range. */
  unicodeRange: text("unicode_range").notNull().default(""),
  /** True for variable fonts (font-weight range comes from the file). */
  isVariable: integer("is_variable", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
