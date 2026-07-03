/** Shared date helpers for the public booking flow (pure). */

/** Today as YYYY-MM-DD (UTC — bookings store local wall-clock times). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Shift a YYYY-MM-DD string by N days. */
export function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Human label like "Mon, Jul 6" for a YYYY-MM-DD string. */
export function humanDate(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
