import "server-only";
import { isConnected } from "@/modules/integrations";
import { busyTimes } from "./gcal-sync";
import { busyToSlotBookings } from "./gcal-busy";
import type { SlotBooking } from "./slots";

/** Map DB booking rows to the shape slotsFor consumes. */
export function toSlotBookings(
  rows: Array<{ date: string; time: string; status: SlotBooking["status"] }>,
  durationMin: number,
): SlotBooking[] {
  return rows.map((r) => ({ date: r.date, time: r.time, durationMin, status: r.status }));
}

/**
 * Google Calendar busy intervals for `dateISO`, as extra SlotBooking rows to
 * subtract — [] when Calendar isn't connected or the call fails, which is the
 * safe default (never wrongly blocks a slot). Best-effort, non-throwing.
 */
export async function googleBusySlotBookings(
  dateISO: string,
  tz: string,
  calendarId: string,
): Promise<SlotBooking[]> {
  try {
    if (!(await isConnected("google-calendar"))) return [];
    const dayStart = `${dateISO}T00:00:00Z`;
    const dayEnd = `${dateISO}T23:59:59Z`;
    const busy = await busyTimes(dayStart, dayEnd, calendarId);
    return busyToSlotBookings(busy, dateISO, tz);
  } catch (err) {
    console.error("[scheduling] busyTimes lookup failed", err);
    return [];
  }
}
