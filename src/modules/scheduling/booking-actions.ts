"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { people } from "@/modules/people/schema";
import { logActivity } from "@/modules/people/activity";
import { bookings, eventTypes } from "./schema";
import { generateManageCode } from "./code";
import { bookingIntakeSchema, LOCATIONS } from "./validation";
import { getEventTypeBySlug, bookingsForDate, getBookingByCode } from "./queries";
import { getAvailabilitySettings } from "./settings";
import { slotsFor, type SlotBooking } from "./slots";
import { sendBookingEmail } from "./reminders";
import {
  createBookingCheckout,
  paidBookingsEnabled,
  refundBookingIfPolicy,
} from "./booking-payment";
import { isConnected } from "@/modules/integrations";
import { busyTimes, deleteBookingEvent, pushBookingEvent } from "./gcal-sync";
import { busyToSlotBookings } from "./gcal-busy";

/** A YYYY-MM-DD date and HH:MM time, validated by shape. */
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time");

const createSchema = z.object({
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

const slotsQuerySchema = z.object({
  eventTypeSlug: z.string().min(1).max(120),
  date: dateSchema,
});

/**
 * Public read action: available HH:MM start times for an event type on a date.
 * The client date-picker island calls this; it recomputes from the DB every
 * time, so the returned list is authoritative (though createBooking re-checks
 * again to close any race).
 */
export async function availableSlots(input: unknown): Promise<string[]> {
  const parsed = slotsQuerySchema.safeParse(input);
  if (!parsed.success) return [];
  const eventType = await getEventTypeBySlug(parsed.data.eventTypeSlug);
  if (!eventType || !eventType.active) return [];
  const settings = await getAvailabilitySettings();
  const existing = await bookingsForDate(eventType.id, parsed.data.date);
  const googleBusy = await googleBusySlotBookings(parsed.data.date, settings.timezone);
  return slotsFor(
    parsed.data.date,
    { durationMin: eventType.durationMin },
    settings,
    [...toSlotBookings(existing, eventType.durationMin), ...googleBusy],
  );
}

/** Map DB booking rows to the shape slotsFor consumes. */
function toSlotBookings(
  rows: Array<{ date: string; time: string; status: SlotBooking["status"] }>,
  durationMin: number,
): SlotBooking[] {
  return rows.map((r) => ({ date: r.date, time: r.time, durationMin, status: r.status }));
}

/**
 * Google Calendar busy intervals for `dateISO`, as extra SlotBooking rows to
 * subtract — [] when Calendar isn't connected or the call fails, which is
 * the safe default (never wrongly blocks a slot). Best-effort, non-throwing.
 */
async function googleBusySlotBookings(dateISO: string, tz: string): Promise<SlotBooking[]> {
  try {
    if (!(await isConnected("google-calendar"))) return [];
    const dayStart = `${dateISO}T00:00:00Z`;
    const dayEnd = `${dateISO}T23:59:59Z`;
    const busy = await busyTimes(dayStart, dayEnd);
    return busyToSlotBookings(busy, dateISO, tz);
  } catch (err) {
    console.error("[scheduling] busyTimes lookup failed", err);
    return [];
  }
}

/**
 * Create a booking (guest-ok). SECURITY: the chosen slot is RE-VALIDATED
 * server-side against slotsFor before insert — the client's picked time is
 * never trusted, which prevents forced double-booking and slot races. An
 * unguessable manage code is generated (the guest's auth to cancel/reschedule).
 * The booker is upserted into People by email and gets an activity entry.
 */
export async function createBooking(input: unknown): Promise<CreateBookingResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid booking." };
  }
  const req = parsed.data;

  const eventType = await getEventTypeBySlug(req.eventTypeSlug);
  if (!eventType || !eventType.active) {
    return { ok: false, error: "That event type is no longer available." };
  }
  if (!eventType.locations.includes(req.location)) {
    return { ok: false, error: "That location is not offered for this event." };
  }

  const settings = await getAvailabilitySettings();
  const existing = await bookingsForDate(eventType.id, req.date);
  const googleBusy = await googleBusySlotBookings(req.date, settings.timezone);
  const available = slotsFor(
    req.date,
    { durationMin: eventType.durationMin },
    settings,
    [...toSlotBookings(existing, eventType.durationMin), ...googleBusy],
  );
  if (!available.includes(req.time)) {
    return { ok: false, error: "That time is no longer available. Please pick another." };
  }

  // Upsert the booker in People by email; never downgrade an existing member.
  const emailLc = req.person.email.toLowerCase();
  const existingPerson = await db.query.people.findFirst({
    where: eq(people.email, emailLc),
  });
  let personId: string;
  if (existingPerson) {
    personId = existingPerson.id;
    // Fill in a missing name/phone without clobbering existing values.
    const patch: Partial<typeof people.$inferInsert> = {};
    if (!existingPerson.name && req.person.name) patch.name = req.person.name;
    if (!existingPerson.phone && req.person.phone) patch.phone = req.person.phone;
    if (Object.keys(patch).length) {
      await db.update(people).set(patch).where(eq(people.id, personId));
    }
  } else {
    const [row] = await db
      .insert(people)
      .values({
        email: emailLc,
        name: req.person.name,
        phone: req.person.phone,
        kind: "lead",
        status: "active",
      })
      .returning({ id: people.id });
    personId = row!.id;
  }

  const code = generateManageCode();
  // Charge only when the event has a price AND Stripe (BYO key) is configured.
  // Otherwise a priced event degrades to a free confirmation so the platform
  // still works without payment keys.
  const chargeable = eventType.priceCents > 0 && paidBookingsEnabled();

  // The `slotsFor` check above is re-validated here at the DB level: a
  // `bookings_slot_idx` partial unique index on (eventTypeId, date, time)
  // (non-cancelled rows only) rejects a genuinely concurrent second insert
  // for the same slot, closing the check-then-insert race the app-level
  // check alone can't prevent.
  try {
    await db.insert(bookings).values({
      code,
      eventTypeId: eventType.id,
      personId,
      date: req.date,
      time: req.time,
      tz: settings.timezone,
      location: req.location,
      // Held `pending` while payment is in flight; the Stripe webhook promotes it
      // to `confirmed`. A pending booking still occupies its slot (see slots.ts).
      status: chargeable ? "pending" : "confirmed",
      answers: req.person.answers,
      stripePaymentIntentId: null,
      remindersSent: {},
    });
  } catch (err) {
    const errCode =
      typeof err === "object" && err !== null && "code" in err ? (err as { code?: string }).code : undefined;
    if (errCode === "SQLITE_CONSTRAINT") {
      return { ok: false, error: "That time is no longer available. Please pick another." };
    }
    throw err;
  }

  await logActivity(personId, "form", `Booked ${eventType.name}`, {
    code,
    date: req.date,
    time: req.time,
    paid: chargeable,
  });

  if (chargeable) {
    // Create the Stripe Checkout Session; the guest completes payment, then the
    // webhook confirms + emails. If session creation fails, the booking stays
    // pending and the guest can retry from the manage page.
    try {
      const { url } = await createBookingCheckout({
        code,
        eventTypeName: eventType.name,
        priceCents: eventType.priceCents,
        customerEmail: req.person.email,
      });
      return { ok: true, code, checkoutUrl: url };
    } catch (err) {
      console.error("[scheduling] booking checkout failed", err);
      return {
        ok: false,
        error: "We couldn't start payment for this booking. Please try again.",
      };
    }
  }

  // Free (or gracefully-degraded) booking: confirm immediately + email.
  try {
    await sendBookingEmail(code, "confirm");
  } catch (err) {
    console.error("[scheduling] confirmation email failed", err);
  }

  // Google Calendar push (best-effort; a Calendar failure never fails the
  // booking). Only attempted when the owner has connected Calendar.
  try {
    if (await isConnected("google-calendar")) {
      const googleEventId = await pushBookingEvent(
        {
          date: req.date,
          time: req.time,
          tz: settings.timezone,
          durationMin: eventType.durationMin,
          location: req.location,
          answers: req.person.answers,
        },
        eventType.name,
      );
      if (googleEventId) {
        await db.update(bookings).set({ googleEventId }).where(eq(bookings.code, code));
      }
    }
  } catch (err) {
    console.error("[scheduling] calendar push failed", err);
  }

  return { ok: true, code };
}

export type ManageResult = { ok: true } | { ok: false; error: string };

/**
 * Cancel a booking via its manage code. The unguessable code IS the auth —
 * there is no session for a guest. Idempotent: cancelling twice is a no-op.
 */
export async function cancelBooking(code: string): Promise<ManageResult> {
  const booking = await getBookingByCode(code);
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status === "cancelled") return { ok: true };

  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(eq(bookings.id, booking.id));

  // Refund a paid booking when policy allows (best-effort; never blocks cancel).
  await refundBookingIfPolicy({
    id: booking.id,
    code: booking.code,
    stripePaymentIntentId: booking.stripePaymentIntentId,
    date: booking.date,
    time: booking.time,
  });

  // Remove the synced Calendar event, if any (best-effort; never blocks cancel).
  if (booking.googleEventId) {
    try {
      if (await isConnected("google-calendar")) {
        await deleteBookingEvent(booking.googleEventId);
      }
    } catch (err) {
      console.error("[scheduling] calendar delete failed", err);
    }
  }

  if (booking.personId) {
    await logActivity(booking.personId, "note", "Cancelled booking", { code });
  }
  return { ok: true };
}

const rescheduleSchema = z.object({ date: dateSchema, time: timeSchema });

/**
 * Reschedule a confirmed booking via its manage code. The new slot is
 * RE-VALIDATED server-side (excluding this booking's own slot) so a reschedule
 * can't force a double-book either.
 */
export async function rescheduleBooking(
  code: string,
  date: string,
  time: string,
): Promise<ManageResult> {
  const parsed = rescheduleSchema.safeParse({ date, time });
  if (!parsed.success) return { ok: false, error: "Invalid date or time." };

  const booking = await getBookingByCode(code);
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status === "cancelled") {
    return { ok: false, error: "This booking was cancelled." };
  }

  const eventType = await db.query.eventTypes.findFirst({
    where: eq(eventTypes.id, booking.eventTypeId),
  });
  if (!eventType) return { ok: false, error: "Event type no longer exists." };

  const settings = await getAvailabilitySettings();
  // Exclude THIS booking from the collision set so it doesn't block itself.
  const others = (await bookingsForDate(booking.eventTypeId, parsed.data.date)).filter(
    (b) => b.id !== booking.id,
  );
  const available = slotsFor(
    parsed.data.date,
    { durationMin: eventType.durationMin },
    settings,
    toSlotBookings(others, eventType.durationMin),
  );
  if (!available.includes(parsed.data.time)) {
    return { ok: false, error: "That time is no longer available." };
  }

  await db
    .update(bookings)
    .set({ date: parsed.data.date, time: parsed.data.time })
    .where(eq(bookings.id, booking.id));
  if (booking.personId) {
    await logActivity(booking.personId, "note", "Rescheduled booking", {
      code,
      date: parsed.data.date,
      time: parsed.data.time,
    });
  }
  return { ok: true };
}
