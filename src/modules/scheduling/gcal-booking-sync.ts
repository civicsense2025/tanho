import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bookings } from "./schema";
import { isConnected } from "@/modules/integrations";
import { patchBookingEvent, pushBookingEvent } from "./gcal-sync";

/**
 * Calendar sync helpers — extracted from booking-actions.ts to keep that file
 * under the 300-line ESLint cap. All best-effort: a Calendar failure never
 * fails a booking.
 */

/** Push a newly created booking to Google Calendar, storing the event id + Meet link. */
export async function syncCreateToCalendar(
  code: string,
  booking: {
    date: string;
    time: string;
    tz: string;
    durationMin: number;
    location: string;
    answers: Array<{ q: string; a: string }>;
    attendeeEmail: string;
    attendeeName: string;
  },
  eventTypeName: string,
  calendarId: string,
): Promise<void> {
  try {
    if (!(await isConnected("google-calendar"))) return;
    const result = await pushBookingEvent(
      {
        date: booking.date,
        time: booking.time,
        tz: booking.tz,
        durationMin: booking.durationMin,
        location: booking.location,
        answers: booking.answers,
        attendeeEmail: booking.attendeeEmail,
        attendeeName: booking.attendeeName,
      },
      eventTypeName,
      calendarId,
    );
    if (result) {
      await db
        .update(bookings)
        .set({ googleEventId: result.id, meetLink: result.meetLink, calendarId })
        .where(eq(bookings.code, code));
    }
  } catch (err) {
    console.error("[scheduling] calendar push failed", err);
  }
}

/**
 * Calendar update on reschedule — PATCH in place avoids the delete+recreate
 * race condition. If PATCH fails (event deleted on the Google side), falls
 * back to a fresh push.
 */
export async function syncRescheduleToCalendar(
  booking: typeof bookings.$inferSelect,
  newDate: string,
  newTime: string,
  tz: string,
  durationMin: number,
  eventTypeName: string,
): Promise<void> {
  if (!booking.googleEventId) return;
  try {
    if (!(await isConnected("google-calendar"))) return;
    const calId = booking.calendarId ?? "primary";
    const patched = await patchBookingEvent(
      booking.googleEventId,
      { date: newDate, time: newTime, tz, durationMin, location: booking.location, answers: booking.answers },
      eventTypeName,
      calId,
    );
    if (patched) {
      await db.update(bookings).set({ meetLink: patched.meetLink }).where(eq(bookings.id, booking.id));
      return;
    }
    // PATCH failed — event may have been deleted on the Google side.
    // Fall back to a fresh push so the booking stays synced.
    const result = await pushBookingEvent(
      { date: newDate, time: newTime, tz, durationMin, location: booking.location, answers: booking.answers },
      eventTypeName,
      calId,
    );
    await db
      .update(bookings)
      .set({ googleEventId: result?.id ?? null, meetLink: result?.meetLink ?? null })
      .where(eq(bookings.id, booking.id));
  } catch (err) {
    console.error("[scheduling] calendar update on reschedule failed", err);
  }
}
