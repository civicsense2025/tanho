import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * The booking block points at an event type by slug (or shows the picker when
 * blank) and renders a card that links into the /book flow. It's a BOUND block:
 * resolve() reads the event type server-side; Render stays pure.
 */
export const bookingSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Event type slug to feature; empty = link to the full picker. */
  eventTypeSlug: z.string().max(120).default(""),
  /** Optional heading override; falls back to the event name. */
  title: z.string().max(160).default(""),
  cta: z.string().max(60).default("Book a time"),
});

export type BookingContent = z.infer<typeof bookingSchema>;

export const makeBooking = (): BookingContent =>
  bookingSchema.parse({ eventTypeSlug: "", title: "", cta: "Book a time" });
