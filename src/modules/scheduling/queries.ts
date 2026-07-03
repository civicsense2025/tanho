import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { people } from "@/modules/people/schema";
import { bookings, eventTypes } from "./schema";

export type EventTypeRow = typeof eventTypes.$inferSelect;
export type BookingRow = typeof bookings.$inferSelect;

/** Which slice of bookings the admin is looking at. */
export type BookingSegment = "upcoming" | "past" | "cancelled";

export type BookingListItem = BookingRow & {
  eventName: string;
  eventColor: string;
  personName: string;
  personEmail: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

/** All event types (admin), newest first. */
export async function listEventTypes(): Promise<EventTypeRow[]> {
  return db.query.eventTypes.findMany({ orderBy: [desc(eventTypes.createdAt)] });
}

/** Active event types (public picker), stable by name. */
export async function listActiveEventTypes(): Promise<EventTypeRow[]> {
  return db.query.eventTypes.findMany({
    where: eq(eventTypes.active, true),
    orderBy: [asc(eventTypes.name)],
  });
}

export async function getEventTypeById(id: string): Promise<EventTypeRow | null> {
  const row = await db.query.eventTypes.findFirst({ where: eq(eventTypes.id, id) });
  return row ?? null;
}

export async function getEventTypeBySlug(slug: string): Promise<EventTypeRow | null> {
  const row = await db.query.eventTypes.findFirst({ where: eq(eventTypes.slug, slug) });
  return row ?? null;
}

/** Confirmed bookings for one event type on one date — feeds slotsFor. */
export async function bookingsForDate(
  eventTypeId: string,
  dateISO: string,
): Promise<BookingRow[]> {
  return db.query.bookings.findMany({
    where: and(eq(bookings.eventTypeId, eventTypeId), eq(bookings.date, dateISO)),
  });
}

/** A booking by its manage code — the guest's unguessable handle. */
export async function getBookingByCode(code: string): Promise<BookingRow | null> {
  const row = await db.query.bookings.findFirst({ where: eq(bookings.code, code) });
  return row ?? null;
}

/** Admin list, enriched with event + person, filtered + sorted by segment. */
export async function listBookings(segment: BookingSegment): Promise<BookingListItem[]> {
  const rows = await db.query.bookings.findMany();
  const types = await db.query.eventTypes.findMany();
  const persons = await db.query.people.findMany();
  const typeById = new Map(types.map((t) => [t.id, t]));
  const personById = new Map(persons.map((p) => [p.id, p]));
  const today = todayISO();

  const items: BookingListItem[] = rows.map((b) => {
    const t = typeById.get(b.eventTypeId);
    const p = b.personId ? personById.get(b.personId) : undefined;
    return {
      ...b,
      eventName: t?.name ?? "Deleted event",
      eventColor: t?.color ?? "accent",
      personName: p?.name ?? "",
      personEmail: p?.email ?? "",
    };
  });

  const filtered = items.filter((b) => {
    if (segment === "cancelled") return b.status === "cancelled";
    if (b.status === "cancelled") return false;
    return segment === "upcoming" ? b.date >= today : b.date < today;
  });

  // Upcoming ascending (soonest first); past + cancelled descending (recent).
  filtered.sort((a, b) => {
    const cmp = `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
    return segment === "upcoming" ? cmp : -cmp;
  });
  return filtered;
}

/** One booking with its event type + linked person (admin detail sheet). */
export async function getBookingDetail(code: string) {
  const booking = await getBookingByCode(code);
  if (!booking) return null;
  const eventType = await getEventTypeById(booking.eventTypeId);
  const person = booking.personId
    ? (await db.query.people.findFirst({ where: eq(people.id, booking.personId) })) ?? null
    : null;
  return { booking, eventType, person };
}

/** Per-segment counts for the booking segment pills. */
export async function bookingCounts(): Promise<Record<BookingSegment, number>> {
  const [upcoming, past, cancelled] = await Promise.all([
    listBookings("upcoming"),
    listBookings("past"),
    listBookings("cancelled"),
  ]);
  return { upcoming: upcoming.length, past: past.length, cancelled: cancelled.length };
}
