import type { AvailabilitySettings } from "./validation";

/**
 * Google Calendar integration — a GRACEFUL STUB. There is no real OAuth here:
 * the "connected" flag lives in the scheduling settings namespace and toggling
 * it flips the admin UI to a connected state. No secrets are stored.
 *
 * HARDENING (later): a real OAuth round-trip would exchange a code for tokens
 * (AES-GCM encrypted at rest per SECURITY.md), then push events via the
 * Calendar API and read busy times into slotsFor. Until then bookings degrade
 * to a client-side "add to Google Calendar" template link the guest clicks.
 */

/** True when the owner has flipped the connect stub on. */
export function isGoogleConnected(settings: AvailabilitySettings): boolean {
  return settings.google.connected;
}

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
