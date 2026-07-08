/**
 * Client-side "Add to Google Calendar" template link builder. This needs no
 * OAuth — it opens Google's prefilled event composer in the guest's browser.
 * The real Calendar sync (push/delete/patch/freebusy + Meet + attendees) lives
 * in gcal-sync.ts (server-only); this module stays import-safe for client
 * components because it touches no tokens or DB code.
 */

/** Combine a YYYY-MM-DD + HH:MM (assumed UTC) into a Google date-time stamp. */
function stamp(dateISO: string, hhmm: string, addMinutes = 0): string {
  const base = new Date(`${dateISO}T${hhmm}:00Z`);
  base.setUTCMinutes(base.getUTCMinutes() + addMinutes);
  return base.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/**
 * Build a client-side "Add to Google Calendar" template URL. This needs no
 * OAuth — it opens Google's prefilled event composer in the guest's browser.
 */
export function addToGoogleCalendarUrl(input: {
  eventName: string;
  date: string;
  time: string;
  durationMin: number;
  location: string;
  details?: string;
}): string {
  const start = stamp(input.date, input.time);
  const end = stamp(input.date, input.time, input.durationMin);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.eventName,
    dates: `${start}/${end}`,
    location: input.location,
    details: input.details ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
