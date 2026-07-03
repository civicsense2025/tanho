import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Scheduling — Calendly-style bookings. Two relational tables:
 * `event_types` (the bookable meeting kinds) and `bookings` (the calendar).
 * Availability, buffers, extensions and templates are NOT relational — they
 * live in the `settings` table under the "scheduling" / "sched_extensions" /
 * "sched_templates" namespaces (see settings.ts). Slot-collision queries need
 * relations, so bookings/event_types are proper tables.
 */
export const eventTypes = sqliteTable("event_types", {
  id: text("id").primaryKey().$defaultFn(createId),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  durationMin: integer("duration_min").notNull().default(30),
  priceCents: integer("price_cents").notNull().default(0),
  color: text("color").notNull().default("accent"),
  description: text("description").notNull().default(""),
  /** Where the meeting happens: any of zoom|meet|phone|person. */
  locations: text("locations", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  /** Optional linked intake form id (forms system); null = built-in intake. */
  formId: text("form_id"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * A confirmed or cancelled booking. `code` is an unguessable crypto-random
 * manage code — for a guest it IS the auth to cancel/reschedule, so it must
 * never be sequential or derivable. `answers` holds the intake responses.
 */
export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    code: text("code").notNull().unique(),
    eventTypeId: text("event_type_id").notNull(),
    /** Linked CRM person (upserted by email on booking); nullable for safety. */
    personId: text("person_id"),
    /** Local date, YYYY-MM-DD. */
    date: text("date").notNull(),
    /** Local start time, HH:MM (24h). */
    time: text("time").notNull(),
    tz: text("tz").notNull().default("UTC"),
    location: text("location").notNull().default(""),
    /**
     * `pending` = slot held while a paid booking awaits Stripe payment; the
     * webhook promotes it to `confirmed`. Free bookings insert as `confirmed`
     * directly. `cancelled` releases the slot.
     */
    status: text("status", { enum: ["pending", "confirmed", "cancelled"] })
      .notNull()
      .default("confirmed"),
    answers: text("answers", { mode: "json" })
      .$type<Array<{ q: string; a: string }>>()
      .notNull()
      .default([]),
    notes: text("notes").notNull().default(""),
    /** Set when synced to Google Calendar (stub today). */
    googleEventId: text("google_event_id"),
    /** Which reminders have fired, e.g. { email: true, sms: false }. */
    remindersSent: text("reminders_sent", { mode: "json" })
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    /** Set for paid bookings once a PaymentIntent is created (Phase 8b). */
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [
    // Prevents a genuine double-book race (concurrent createBooking calls
    // for the same slot): the DB rejects the second insert outright rather
    // than relying solely on the app-level check-then-insert. Partial (only
    // non-cancelled rows) so a cancelled booking's slot can be rebooked.
    uniqueIndex("bookings_slot_idx")
      .on(t.eventTypeId, t.date, t.time)
      .where(sql`${t.status} != 'cancelled'`),
  ],
);
