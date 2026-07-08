"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { logActivity } from "@/modules/people/activity";
import { bookings, eventTypes } from "./schema";
import { generateManageCode } from "./code";
import {
  createSchema,
  rescheduleSchema,
  slotsQuerySchema,
  type CreateBookingResult,
} from "./booking-schemas";
import { getEventTypeBySlug, bookingsForDate, getBookingByCode } from "./queries";
import { getAvailabilitySettings } from "./settings";
import { slotsFor } from "./slots";
import { sendBookingEmail } from "./reminders";
import {
  createBookingCheckout,
  paidBookingsEnabled,
  refundBookingIfPolicy,
} from "./booking-payment";
import { isConnected } from "@/modules/integrations";
import { deleteBookingEvent } from "./gcal-sync";
import { syncCreateToCalendar, syncRescheduleToCalendar } from "./gcal-booking-sync";
import { toSlotBookings, googleBusySlotBookings } from "./slot-helpers";
import { upsertBooker } from "./booking-people";

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
  const googleBusy = await googleBusySlotBookings(parsed.data.date, settings.timezone, settings.google.calendarId);
  return slotsFor(
    parsed.data.date,
    { durationMin: eventType.durationMin },
    settings,
    [...toSlotBookings(existing, eventType.durationMin), ...googleBusy],
  );
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
  const googleBusy = await googleBusySlotBookings(req.date, settings.timezone, settings.google.calendarId);
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
  const personId = await upsertBooker({
    email: req.person.email,
    name: req.person.name,
    phone: req.person.phone,
  });

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
    // startsWith, not ===: the local (embedded) client normalizes to the
    // base code "SQLITE_CONSTRAINT", but a remote libSQL/Turso connection
    // (the Hrana protocol) reports the more specific extended code (e.g.
    // "SQLITE_CONSTRAINT_UNIQUE") directly in this same `code` field with
    // no normalization — an exact match would miss every remote deploy.
    if (errCode?.startsWith("SQLITE_CONSTRAINT")) {
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
  // booking). The guest is added as an attendee so Google sends a real calendar
  // invite with the Meet link. The returned event id + Meet link are stored.
  await syncCreateToCalendar(
    code,
    {
      date: req.date,
      time: req.time,
      tz: settings.timezone,
      durationMin: eventType.durationMin,
      location: req.location,
      answers: req.person.answers,
      attendeeEmail: req.person.email,
      attendeeName: req.person.name,
    },
    eventType.name,
    settings.google.calendarId,
  );

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
        await deleteBookingEvent(booking.googleEventId, booking.calendarId ?? "primary");
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
  // Include Google Calendar busy times — same as createBooking/availableSlots,
  // so a reschedule can't land on a slot blocked by an external calendar event.
  const googleBusy = await googleBusySlotBookings(parsed.data.date, settings.timezone, settings.google.calendarId);
  const available = slotsFor(
    parsed.data.date,
    { durationMin: eventType.durationMin },
    settings,
    [...toSlotBookings(others, eventType.durationMin), ...googleBusy],
  );
  if (!available.includes(parsed.data.time)) {
    return { ok: false, error: "That time is no longer available." };
  }

  await db
    .update(bookings)
    .set({ date: parsed.data.date, time: parsed.data.time })
    .where(eq(bookings.id, booking.id));

  // Update the synced Calendar event (best-effort; a Calendar failure never
  // fails the reschedule). PATCH in place avoids the delete+recreate race.
  await syncRescheduleToCalendar(
    booking,
    parsed.data.date,
    parsed.data.time,
    settings.timezone,
    eventType.durationMin,
    eventType.name,
  );

  if (booking.personId) {
    await logActivity(booking.personId, "note", "Rescheduled booking", {
      code,
      date: parsed.data.date,
      time: parsed.data.time,
    });
  }
  return { ok: true };
}
