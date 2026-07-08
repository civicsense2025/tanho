import "server-only";
import { getAccessToken } from "@/adapters/google/oauth";

/**
 * Real Google Calendar sync (push/delete/patch/free-busy) via direct fetch — the
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
  /** Guest email + name — added as an attendee so Google sends a calendar invite. */
  attendeeEmail?: string;
  attendeeName?: string;
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

/** Result of a successful event push — the id to store + the Meet link if created. */
export type PushResult = { id: string; meetLink: string | null };

/**
 * Create a calendar event for a confirmed booking. Returns the Google event id
 * and optional Meet link to store on the booking row, or null if Calendar isn't
 * connected / the call fails (callers must treat null as non-fatal).
 *
 * `calendarId` defaults to "primary" when not specified. When `createMeet` is
 * true, the event includes a Google Meet conference request; the Calendar API
 * generates the Meet link asynchronously and returns it in the response.
 */
export async function pushBookingEvent(
  booking: BookingForCalendar,
  eventTypeName: string,
  calendarId = "primary",
  createMeet = true,
): Promise<PushResult | null> {
  const token = await getAccessToken("google-calendar");
  if (!token) return null;

  const start = toRfc3339(booking.date, booking.time);
  const end = addMinutes(booking.date, booking.time, booking.durationMin).replace("Z", "");
  const description = booking.answers.map((a) => `${a.q}: ${a.a}`).join("\n");

  const attendees =
    booking.attendeeEmail != null
      ? [{ email: booking.attendeeEmail, displayName: booking.attendeeName ?? undefined }]
      : undefined;

  const body: Record<string, unknown> = {
    summary: eventTypeName,
    location: booking.location,
    description,
    start: { dateTime: start, timeZone: booking.tz },
    end: { dateTime: end, timeZone: booking.tz },
    attendees,
  };
  if (createMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: `${booking.date}-${booking.time}-${Math.random().toString(36).slice(2, 10)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const params = new URLSearchParams();
  if (createMeet) params.set("conferenceDataVersion", "1");
  if (attendees) params.set("sendUpdates", "all");

  try {
    const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[gcal-sync] create event failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { id?: string; conferenceData?: { entryPoints?: Array<{ uri?: string }> } };
    const meetLink = data.conferenceData?.entryPoints?.find((e) => e.uri?.startsWith("https://meet.google.com"))?.uri ?? null;
    return data.id ? { id: data.id, meetLink } : null;
  } catch (err) {
    console.error("[gcal-sync] create event error", err);
    return null;
  }
}

/** Delete a previously-pushed event (cancellation). Best-effort, non-throwing. */
export async function deleteBookingEvent(
  googleEventId: string,
  calendarId = "primary",
): Promise<void> {
  const token = await getAccessToken("google-calendar");
  if (!token) return;

  try {
    const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
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

/**
 * Patch an existing event's time (and Meet link) in place — the efficient
 * update path that avoids the delete+recreate race condition. Returns the new
 * Meet link if the event had conference data, or null on failure / no Meet.
 * Best-effort: a Calendar failure never fails the reschedule.
 */
export async function patchBookingEvent(
  googleEventId: string,
  booking: BookingForCalendar,
  eventTypeName: string,
  calendarId = "primary",
): Promise<{ meetLink: string | null } | null> {
  const token = await getAccessToken("google-calendar");
  if (!token) return null;

  const start = toRfc3339(booking.date, booking.time);
  const end = addMinutes(booking.date, booking.time, booking.durationMin).replace("Z", "");

  try {
    const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summary: eventTypeName,
        start: { dateTime: start, timeZone: booking.tz },
        end: { dateTime: end, timeZone: booking.tz },
      }),
    });
    if (!res.ok) {
      console.error("[gcal-sync] patch event failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { conferenceData?: { entryPoints?: Array<{ uri?: string }> } };
    const meetLink = data.conferenceData?.entryPoints?.find((e) => e.uri?.startsWith("https://meet.google.com"))?.uri ?? null;
    return { meetLink };
  } catch (err) {
    console.error("[gcal-sync] patch event error", err);
    return null;
  }
}

export type BusyInterval = { start: string; end: string };

/**
 * Busy intervals (ISO datetimes) on the given calendar within a date range, via
 * freeBusy. Returns [] when not connected or on any failure — slotsFor treats
 * an empty busy list as "nothing to subtract", the safe default that never
 * wrongly blocks a slot.
 */
export async function busyTimes(
  rangeStartISO: string,
  rangeEndISO: string,
  calendarId = "primary",
): Promise<BusyInterval[]> {
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
        items: [{ id: calendarId }],
      }),
    });
    if (!res.ok) {
      console.error("[gcal-sync] freeBusy failed", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: BusyInterval[] }>;
    };
    return data.calendars?.[calendarId]?.busy ?? [];
  } catch (err) {
    console.error("[gcal-sync] freeBusy error", err);
    return [];
  }
}
