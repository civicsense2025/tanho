import { z } from "zod";
import { bookingIntakeSchema, LOCATIONS } from "./validation";

/** A YYYY-MM-DD date and HH:MM time, validated by shape. */
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time");

export const createSchema = z.object({
  eventTypeSlug: z.string().min(1).max(120),
  date: dateSchema,
  time: timeSchema,
  location: z.enum(LOCATIONS),
  person: bookingIntakeSchema,
});

export type CreateBookingResult =
  | { ok: true; code: string }
  /** Paid booking held pending — guest must complete Stripe checkout. */
  | { ok: true; code: string; checkoutUrl: string }
  | { ok: false; error: string };

export const slotsQuerySchema = z.object({
  eventTypeSlug: z.string().min(1).max(120),
  date: dateSchema,
});

export const rescheduleSchema = z.object({ date: dateSchema, time: timeSchema });
