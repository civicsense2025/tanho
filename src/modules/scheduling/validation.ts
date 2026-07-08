import { z } from "zod";

/**
 * Scheduling write schemas. Availability, extensions and templates are stored
 * in the `settings` table (namespaces scheduling / sched_extensions /
 * sched_templates) and parse through the schemas here on every write; event
 * types and booking intake parse here too. Prices are integer CENTS.
 */

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only");

export const LOCATIONS = ["zoom", "meet", "phone", "person"] as const;

/** An event type (a bookable meeting kind). */
export const eventTypeSchema = z.object({
  slug,
  name: z.string().min(1).max(160),
  durationMin: z.number().int().min(5).max(480).default(30),
  priceCents: z.number().int().min(0).max(100_000_00).default(0),
  color: z.enum(["accent", "accent2", "maroon", "olive", "ink"]).default("accent"),
  description: z.string().max(2000).default(""),
  locations: z.array(z.enum(LOCATIONS)).max(4).default(["zoom"]),
  formId: z.string().max(120).nullable().default(null),
  active: z.boolean().default(true),
});
export type EventTypeInput = z.infer<typeof eventTypeSchema>;

/** One intake answer captured at booking time. */
export const answerSchema = z.object({
  q: z.string().max(200),
  a: z.string().max(2000),
});

/** Public booking intake — who is booking and what they answered. */
export const bookingIntakeSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.email().max(200),
  phone: z.string().max(40).default(""),
  answers: z.array(answerSchema).max(30).default([]),
});
export type BookingIntakeInput = z.infer<typeof bookingIntakeSchema>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** One weekday's working window, or null when the day is off. */
const dayHoursSchema = z
  .object({ from: z.string().regex(HHMM), to: z.string().regex(HHMM) })
  .nullable();

/** Which Google Calendar to sync bookings to ("primary" by default). */
const googleSchema = z.object({
  calendarId: z.string().max(200).default("primary"),
});

/**
 * Availability + rules — the "scheduling" settings namespace. `hours` is keyed
 * by weekday 0..6 (0 = Sunday, matching Date.getUTCDay()).
 */
export const availabilitySettingsSchema = z.object({
  timezone: z.string().min(1).max(80).default("UTC"),
  minNoticeHours: z.number().int().min(0).max(720).default(12),
  dailyCap: z.number().int().min(0).max(100).default(4),
  bufferBeforeMin: z.number().int().min(0).max(240).default(0),
  bufferAfterMin: z.number().int().min(0).max(240).default(0),
  slotIncrementMin: z.number().int().min(5).max(240).default(30),
  hours: z.partialRecord(z.enum(["0", "1", "2", "3", "4", "5", "6"]), dayHoursSchema).default({}),
  google: googleSchema.default({ calendarId: "primary" }),
});
export type AvailabilitySettings = z.infer<typeof availabilitySettingsSchema>;
export const AVAILABILITY_DEFAULTS: AvailabilitySettings =
  availabilitySettingsSchema.parse({});

/** One toggleable extension with an opaque per-extension settings bag. */
export const extensionSchema = z.object({
  id: z.string().max(60),
  label: z.string().max(120).default(""),
  on: z.boolean().default(false),
  settings: z.record(z.string(), z.unknown()).default({}),
});

/** The "sched_extensions" namespace — an array of extensions. */
export const extensionsSchema = z.object({
  items: z.array(extensionSchema).max(40).default([]),
});
export type ExtensionsSettings = z.infer<typeof extensionsSchema>;
export const EXTENSIONS_DEFAULTS: ExtensionsSettings = extensionsSchema.parse({});

/** The "sched_templates" namespace — copy with {{placeholders}}. */
export const templatesSchema = z.object({
  emailConfirmSubject: z.string().max(200).default("Your booking is confirmed"),
  emailConfirm: z.string().max(4000).default(""),
  emailReminderSubject: z.string().max(200).default("Reminder: your upcoming booking"),
  emailReminder: z.string().max(4000).default(""),
  sms: z.string().max(1000).default(""),
  page: z.string().max(2000).default(""),
});
export type TemplatesSettings = z.infer<typeof templatesSchema>;
export const TEMPLATES_DEFAULTS: TemplatesSettings = templatesSchema.parse({});
