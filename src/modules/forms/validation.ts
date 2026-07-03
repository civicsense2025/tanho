import { z } from "zod";
import { FIELD_KINDS, type FieldKind } from "./field-kinds";

/**
 * Form-definition schemas — the authority for what an admin may save. The
 * matching submission validator (what a visitor may POST) is built per-form in
 * submission-schema.ts, re-exported at the bottom of this file.
 */

const KIND_VALUES = FIELD_KINDS.map((k) => k.id) as [FieldKind, ...FieldKind[]];

const optionSchema = z.object({
  label: z.string().max(200).default(""),
  value: z.string().max(200).default(""),
  image: z
    .string()
    .max(2000)
    .regex(/^\/api\/media\/|^https:\/\//, "Must be an /api/media path or https:// URL")
    .optional(),
});

/** One field in a form definition. Optional props apply per-kind. */
export const formFieldSchema = z.object({
  id: z.string().min(1).max(60),
  kind: z.enum(KIND_VALUES),
  label: z.string().max(300).default(""),
  required: z.boolean().default(false),
  placeholder: z.string().max(200).default(""),
  help: z.string().max(500).default(""),
  options: z.array(optionSchema).max(50).default([]),
  correct: z.array(z.string().max(200)).max(50).default([]),
  points: z.number().int().min(0).max(1000).default(0),
  max: z.number().int().min(0).max(1_000_000).optional(),
  min: z.number().int().min(0).max(1_000_000).optional(),
  default: z.string().max(500).default(""),
  pattern: z.string().max(300).default(""),
  currency: z.enum(["usd", "eur", "gbp", "cad"]).default("usd"),
  multi: z.boolean().default(false),
  accept: z.string().max(200).default(""),
  /** Payment fields only: the charge amount, in the smallest currency unit. */
  amountCents: z.number().int().min(0).max(100_000_000).default(0),
});
export type FormField = z.infer<typeof formFieldSchema>;

export const THEMES = ["studio", "ink", "sky", "forest", "clay"] as const;

export const formDesignSchema = z.object({
  theme: z.enum(THEMES).default("studio"),
  layout: z.enum(["classic", "conversational"]).default("classic"),
  accent: z
    .string()
    .max(9)
    .regex(/^#[0-9a-fA-F]{3,8}$/, "Must be a hex color")
    .default("#3b6ef5"),
});
export type FormDesign = z.infer<typeof formDesignSchema>;

/** A same-origin relative path — blocks open redirects on postSubmit. */
const relativePath = z
  .string()
  .max(500)
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")), {
    message: "Redirect must be a same-site path starting with /",
  });

export const formSettingsSchema = z.object({
  submitLabel: z.string().max(60).default("Submit"),
  postSubmit: z.enum(["message", "redirect"]).default("message"),
  message: z.string().max(1000).default("Thanks — we got your response."),
  redirect: relativePath.default(""),
  storeIn: z.enum(["contacts", "subscribers", "leads", "none"]).default("none"),
  tagOnSubmit: z.array(z.string().max(60)).max(20).default([]),
  trackSource: z.boolean().default(true),
  doubleOptIn: z.boolean().default(false),
  notify: z.boolean().default(false),
  notifyTo: z.string().email().max(200).or(z.literal("")).default(""),
  spam: z.boolean().default(true),
  saveResume: z.boolean().default(false),
  limitOn: z.boolean().default(false),
  limitCount: z.number().int().min(0).max(1_000_000).default(0),
  closeOn: z.boolean().default(false),
  closeDate: z.string().max(40).default(""),
  requireLogin: z.boolean().default(false),
  quizShowScore: z.boolean().default(true),
  quizPassMark: z.number().int().min(0).max(1_000_000).default(0),
});
export type FormSettings = z.infer<typeof formSettingsSchema>;

const outcomeSchema = z.object({
  id: z.string().max(60).default(""),
  label: z.string().max(200).default(""),
  min: z.number().int().min(0).max(1_000_000).default(0),
  message: z.string().max(2000).default(""),
});

export const quizConfigSchema = z.object({
  mode: z.enum(["outcome", "score"]).default("score"),
  outcomes: z.array(outcomeSchema).max(30).default([]),
});
export type QuizConfig = z.infer<typeof quizConfigSchema>;

/** The whole form definition (admin create/update payload). */
export const formInputSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["form", "quiz", "signup"]).default("form"),
  status: z.enum(["draft", "published"]).default("draft"),
  fields: z.array(formFieldSchema).max(200).default([]),
  design: formDesignSchema.default(formDesignSchema.parse({})),
  settings: formSettingsSchema.default(formSettingsSchema.parse({})),
  quiz: quizConfigSchema.nullable().default(null),
});
export type FormInput = z.infer<typeof formInputSchema>;

export const FORM_DESIGN_DEFAULTS: FormDesign = formDesignSchema.parse({});
export const FORM_SETTINGS_DEFAULTS: FormSettings = formSettingsSchema.parse({});

export { buildSubmissionSchema } from "./submission-schema";
