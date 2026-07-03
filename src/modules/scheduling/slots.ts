import type { AvailabilitySettings } from "./validation";

/** The subset of an event type the slot math needs. */
export type SlotEventType = { durationMin: number };

/**
 * The subset of a booking the slot math needs. A slot is occupied by a
 * `confirmed` booking OR a `pending` one (a paid booking holding its slot while
 * Stripe payment is in flight) — both must block others to avoid double-booking
 * and payment races. Only `cancelled` frees the slot.
 */
export type SlotBooking = {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMin: number;
  status: "pending" | "confirmed" | "cancelled";
};

/** A booking status that occupies a slot (blocks other bookings). */
function occupies(status: SlotBooking["status"]): boolean {
  return status === "confirmed" || status === "pending";
}

const DAY_MIN = 24 * 60;

/** "HH:MM" → minutes since local midnight. */
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** minutes since local midnight → "HH:MM". */
function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** UTC weekday 0..6 (0 = Sunday) for a YYYY-MM-DD date. */
function weekday(dateISO: string): number {
  return new Date(`${dateISO}T00:00:00Z`).getUTCDay();
}

/**
 * Available start times (HH:MM) for `dateISO` and a given event type.
 *
 * PURE. Intersects, in order:
 *  - the weekday's working window from settings.hours (day off → no slots)
 *  - the daily cap (already at cap → no slots)
 *  - minimum notice (now + minNoticeHours), when `now` is supplied
 *  - buffers before/after each candidate, kept inside the working window
 *  - no overlap with an existing CONFIRMED booking's occupied window
 *    (that booking's duration expanded by the same before/after buffers)
 *
 * Candidates step every `slotIncrementMin` minutes from the window start. A
 * slot is offered only if the whole meeting + its trailing buffer fits before
 * the window closes and it collides with nothing.
 */
export function slotsFor(
  dateISO: string,
  eventType: SlotEventType,
  settings: AvailabilitySettings,
  existingBookings: SlotBooking[],
  now: Date = new Date(),
): string[] {
  const key = String(weekday(dateISO)) as keyof typeof settings.hours;
  const window = settings.hours[key] ?? null;
  if (!window) return [];

  const dur = eventType.durationMin;
  const before = settings.bufferBeforeMin;
  const after = settings.bufferAfterMin;
  const inc = settings.slotIncrementMin;

  const winStart = toMin(window.from);
  const winEnd = toMin(window.to);
  if (winEnd <= winStart) return [];

  // Occupied bookings (confirmed or payment-pending) on this date, as occupied
  // [start, end) windows expanded by the buffers so we never place a meeting
  // inside another's breathing room.
  const busy = existingBookings
    .filter((b) => occupies(b.status) && b.date === dateISO)
    .map((b) => {
      const s = toMin(b.time);
      return { start: s - before, end: s + b.durationMin + after };
    });

  // Daily cap counts occupied bookings already on the day.
  if (settings.dailyCap > 0 && busy.length >= settings.dailyCap) return [];

  // Minimum notice: the earliest local minute a start may fall on. Only applies
  // to today (and only when `now` lands on this date in the settings tz — we
  // treat the wall clock as local, matching how bookings store local time).
  const nowISO = localDateISO(now, settings.timezone);
  let minStart = winStart;
  if (nowISO === dateISO) {
    const noticeCutoff = localMinutes(now, settings.timezone) + settings.minNoticeHours * 60;
    minStart = Math.max(minStart, Math.ceil(noticeCutoff / inc) * inc);
  } else if (dateISO < nowISO) {
    return []; // a past date has no slots
  }

  const out: string[] = [];
  for (let start = winStart; start + dur + after <= winEnd; start += inc) {
    if (start < minStart) continue;
    const occStart = start - before;
    const occEnd = start + dur + after;
    // Reject if the buffered window would spill outside the day at all.
    if (occStart < 0 || occEnd > DAY_MIN) continue;
    const clashes = busy.some((b) => occStart < b.end && occEnd > b.start);
    if (!clashes) out.push(toHHMM(start));
  }
  return out;
}

/** Format a Date as YYYY-MM-DD in the given IANA timezone. */
function localDateISO(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Minutes since local midnight for a Date in the given IANA timezone. */
function localMinutes(d: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return (h % 24) * 60 + m;
  } catch {
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}
