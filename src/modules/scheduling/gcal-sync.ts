import "server-only";
import { getAccessToken } from "@/adapters/google/oauth";

/**
 * Real Google Calendar sync (push/delete/free-busy) via direct fetch — the
 * `gcal.ts` stub (addToGoogleCalendarUrl, isGoogleConnected) is imported
 * broadly and stays as-is; this is a separate server-only module so nothing
 * that only needs the client-side template link pulls in OAuth/token code.
 * Every call is best-effort from the caller's perspective: a Calendar failure
 * must never fail a booking (see booking-actions.ts call sites).
 */

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export type BookingForCalendar = {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h, local to `tz`)
  tz: string;
  durationMin: number;
  location: string;
  answers: Array<{ q: string; a: string }>;
};

/** Combine a YYYY-MM-DD + HH:MM into an RFC3339 dateTime for the Calendar API. */
function toRfc3339(dateISO: string, hhmm: string): string {
  return `${dateISO}T${hhmm}:00`;
}

function addMinutes(dateISO: string, hhmm: string, minutes: number): string {
  const base = new Date(`${dateISO}T${hhmm}:00Z`);
  base.setUTCMinutes(base.getUTCMinutes() + minutes);
  return base.toISOString().replace(/\.\d{3}Z$/, "");
}

/**
 * Create a primary-calendar event for a confirmed booking. Returns the
 * Google event id to store on `bookings.googleEventId`, or null if Calendar
 * isn't connected / the call fails (callers must treat null as non-fatal).
 */
export async function pushBookingEvent(
  booking: BookingForCalendar,
  eventTypeName: string,
): Promise<string | null> {
  const token = await getAccessToken("google-calendar");
  if (!token) return null;

  const start = toRfc3339(booking.date, booking.time);
  const end = addMinutes(booking.date, booking.time, booking.durationMin).replace("Z", "");
  const description = booking.answers.map((a) => `${a.q}: ${a.a}`).join("\n");

  try {
    const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summary: eventTypeName,
        location: booking.location,
        description,
        start: { dateTime: start, timeZone: booking.tz },
        end: { dateTime: end, timeZone: booking.tz },
      }),
    });
    if (!res.ok) {
      console.error("[gcal-sync] create event failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch (err) {
    console.error("[gcal-sync] create event error", err);
    return null;
  }
}

/** Delete a previously-pushed event (cancellation). Best-effort, non-throwing. */
export async function deleteBookingEvent(googleEventId: string): Promise<void> {
  const token = await getAccessToken("google-calendar");
  if (!token) return;

  try {
    const res = await fetch(`${CALENDAR_API}/calendars/primary/events/${googleEventId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    // 410 Gone means it's already deleted on the Google side — fine either way.
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.error("[gcal-sync] delete event failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("[gcal-sync] delete event error", err);
  }
}

export type BusyInterval = { start: string; end: string };

/**
 * Busy intervals (ISO datetimes) on the primary calendar within a date
 * range, via freeBusy. Returns [] when not connected or on any failure —
 * slotsFor treats an empty busy list as "nothing to subtract", the safe
 * default that never wrongly blocks a slot.
 */
export async function busyTimes(rangeStartISO: string, rangeEndISO: string): Promise<BusyInterval[]> {
  const token = await getAccessToken("google-calendar");
  if (!token) return [];

  try {
    const res = await fetch(`${CALENDAR_API}/freeBusy`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        timeMin: rangeStartISO,
        timeMax: rangeEndISO,
        items: [{ id: "primary" }],
      }),
    });
    if (!res.ok) {
      console.error("[gcal-sync] freeBusy failed", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: BusyInterval[] }>;
    };
    return data.calendars?.primary?.busy ?? [];
  } catch (err) {
    console.error("[gcal-sync] freeBusy error", err);
    return [];
  }
}
