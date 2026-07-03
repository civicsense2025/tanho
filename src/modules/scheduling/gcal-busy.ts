import type { SlotBooking } from "./slots";
import type { BusyInterval } from "./gcal-sync";

/**
 * Convert Google Calendar freeBusy intervals (RFC3339 UTC datetimes) into
 * synthetic SlotBooking rows slotsFor can subtract, for one specific local
 * date in the given IANA timezone. PURE — no network/DB.
 *
 * slotsFor only understands whole-day, local wall-clock date+time+duration
 * bookings, so each busy interval is clipped to the [00:00, 24:00) window of
 * `dateISO` in `tz` and represented as a single occupied span. An interval
 * that doesn't touch this date at all contributes nothing.
 */
export function busyToSlotBookings(
  busy: BusyInterval[],
  dateISO: string,
  tz: string,
): SlotBooking[] {
  const dayStart = zonedTimeToUtcMs(dateISO, "00:00", tz);
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const out: SlotBooking[] = [];
  for (const interval of busy) {
    const start = Date.parse(interval.start);
    const end = Date.parse(interval.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

    const clippedStart = Math.max(start, dayStart);
    const clippedEnd = Math.min(end, dayEnd);
    if (clippedEnd <= clippedStart) continue; // doesn't touch this date

    const startMin = Math.floor((clippedStart - dayStart) / 60_000);
    const durationMin = Math.ceil((clippedEnd - clippedStart) / 60_000);
    out.push({
      date: dateISO,
      time: minutesToHHMM(startMin),
      durationMin,
      status: "confirmed",
    });
  }
  return out;
}

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** UTC epoch ms for a YYYY-MM-DD + HH:MM wall-clock time in an IANA timezone. */
function zonedTimeToUtcMs(dateISO: string, hhmm: string, tz: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  // Start from the UTC-literal instant, then correct by the zone's offset at
  // that instant. Good enough for day-boundary clipping (DST-edge slop of a
  // few minutes only matters at the transition day itself).
  const naiveUtc = Date.UTC(
    Number(dateISO.slice(0, 4)),
    Number(dateISO.slice(5, 7)) - 1,
    Number(dateISO.slice(8, 10)),
    h ?? 0,
    m ?? 0,
  );
  const offsetMin = tzOffsetMinutes(new Date(naiveUtc), tz);
  return naiveUtc - offsetMin * 60_000;
}

/** Minutes to ADD to local time to get UTC, for `tz` at instant `at`. */
function tzOffsetMinutes(at: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
    return Math.round((asUtc - at.getTime()) / 60_000);
  } catch {
    return 0;
  }
}
