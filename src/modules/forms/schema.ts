import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { FormDesign, FormField, FormSettings, QuizConfig } from "./validation";

/** Denormalised view/funnel counters kept on the form row. */
export type FormAnalytics = {
  views: number;
  starts: number;
  completions: number;
};

/**
 * Forms — the form builder's record. `fields`/`design`/`settings`/`quiz` are
 * JSON trees nobody queries across, so they live inline; responses are a
 * separate relational table (counted, joined to people). The three form types
 * (form | quiz | signup) share one shape — `quiz` is only meaningful when
 * type="quiz". Everything is zod-validated on write (see validation.ts).
 */
export const forms = sqliteTable("forms", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull().default("Untitled form"),
  type: text("type", { enum: ["form", "quiz", "signup"] })
    .notNull()
    .default("form"),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  fields: text("fields", { mode: "json" }).$type<FormField[]>().notNull().default([]),
  design: text("design", { mode: "json" }).$type<FormDesign>().notNull(),
  settings: text("settings", { mode: "json" }).$type<FormSettings>().notNull(),
  quiz: text("quiz", { mode: "json" }).$type<QuizConfig | null>(),
  analytics: text("analytics", { mode: "json" })
    .$type<FormAnalytics>()
    .notNull()
    .default({ views: 0, starts: 0, completions: 0 }),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * One submission. `values` is the fieldId→value map (validated server-side
 * against the form's own field defs before insert). `personId` links to the
 * CRM row created/matched by the response pipeline; `outcome`/`score` are set
 * for quizzes. Never exposed publicly — reads are admin-only.
 */
export const formResponses = sqliteTable("form_responses", {
  id: text("id").primaryKey().$defaultFn(createId),
  formId: text("form_id").notNull(),
  personId: text("person_id"),
  at: integer("at")
    .notNull()
    .$defaultFn(() => Date.now()),
  source: text("source").notNull().default("web"),
  values: text("values", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  outcome: text("outcome"),
  score: integer("score"),
});

export type FormRow = typeof forms.$inferSelect;
export type FormResponseRow = typeof formResponses.$inferSelect;
