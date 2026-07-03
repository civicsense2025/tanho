import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders } from "@/modules/commerce/schema";
import {
  emailSubscriptions,
  memberships,
  people,
  personActivity,
} from "./schema";

export type PersonRow = typeof people.$inferSelect;

/** CRM segments. "staff" has no people rows yet (admins live in `users`). */
export type Segment =
  | "all-active"
  | "members"
  | "subscribers"
  | "unsubscribed"
  | "leads"
  | "staff"
  | "invited";

export type PersonListItem = PersonRow & {
  membershipTier: string | null;
  subscribed: boolean;
};

export function matchesSegment(p: PersonListItem, segment: Segment): boolean {
  switch (segment) {
    case "all-active":
      return p.status === "active";
    case "members":
      return p.kind === "member" && p.status === "active";
    case "subscribers":
      return p.subscribed && p.status !== "unsubscribed";
    case "unsubscribed":
      return p.status === "unsubscribed" || !p.subscribed;
    case "leads":
      return p.kind === "lead";
    case "staff":
      return false; // admins are `users`, not `people`
    case "invited":
      return p.status === "invited";
  }
}

/** Uncached admin list — enriched with membership tier + subscription state. */
export async function listPeople(
  segment: Segment,
  search?: string,
): Promise<PersonListItem[]> {
  const rows = await db.query.people.findMany({ orderBy: [desc(people.createdAt)] });
  const activeMemberships = await db.query.memberships.findMany({
    where: eq(memberships.status, "active"),
  });
  const subscribedRows = await db.query.emailSubscriptions.findMany({
    where: eq(emailSubscriptions.status, "subscribed"),
  });
  const tierByPerson = new Map(activeMemberships.map((m) => [m.personId, m.tier]));
  const subscribedSet = new Set(subscribedRows.map((s) => s.personId));

  let items: PersonListItem[] = rows.map((p) => ({
    ...p,
    membershipTier: tierByPerson.get(p.id) ?? null,
    subscribed: subscribedSet.has(p.id),
  }));

  items = items.filter((p) => matchesSegment(p, segment));

  const needle = search?.trim().toLowerCase();
  if (needle) {
    items = items.filter((p) =>
      [p.name, p.email, p.company, ...(p.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }
  return items;
}

/** Uncached admin list — every person, enriched (client filters by segment). */
export async function listAllPeople(): Promise<PersonListItem[]> {
  const rows = await db.query.people.findMany({ orderBy: [desc(people.createdAt)] });
  const activeMemberships = await db.query.memberships.findMany({
    where: eq(memberships.status, "active"),
  });
  const subscribedRows = await db.query.emailSubscriptions.findMany({
    where: eq(emailSubscriptions.status, "subscribed"),
  });
  const tierByPerson = new Map(activeMemberships.map((m) => [m.personId, m.tier]));
  const subscribedSet = new Set(subscribedRows.map((s) => s.personId));
  return rows.map((p) => ({
    ...p,
    membershipTier: tierByPerson.get(p.id) ?? null,
    subscribed: subscribedSet.has(p.id),
  }));
}

/** Full profile: the person + their activity, memberships, and subscriptions. */
export async function getPerson(id: string) {
  const person = await db.query.people.findFirst({ where: eq(people.id, id) });
  if (!person) return null;
  const activity = await db.query.personActivity.findMany({
    where: eq(personActivity.personId, id),
    orderBy: [desc(personActivity.at)],
  });
  const membershipRows = await db.query.memberships.findMany({
    where: eq(memberships.personId, id),
    orderBy: [desc(memberships.since)],
  });
  const subscriptions = await db.query.emailSubscriptions.findMany({
    where: eq(emailSubscriptions.personId, id),
  });
  const orderRows = await db.query.orders.findMany({
    where: eq(orders.personId, id),
    orderBy: [desc(orders.placedAt)],
  });
  return { person, activity, memberships: membershipRows, subscriptions, orders: orderRows };
}

/** Per-segment counts for the segment pills. */
export async function segmentCounts(): Promise<Record<Segment, number>> {
  const all = await listPeople("all-active");
  const everyone = await db.query.people.findMany();
  const activeMemberships = await db.query.memberships.findMany({
    where: eq(memberships.status, "active"),
  });
  const subscribedRows = await db.query.emailSubscriptions.findMany({
    where: eq(emailSubscriptions.status, "subscribed"),
  });
  const tierByPerson = new Map(activeMemberships.map((m) => [m.personId, m.tier]));
  const subscribedSet = new Set(subscribedRows.map((s) => s.personId));
  const enriched: PersonListItem[] = everyone.map((p) => ({
    ...p,
    membershipTier: tierByPerson.get(p.id) ?? null,
    subscribed: subscribedSet.has(p.id),
  }));
  const count = (s: Segment) => enriched.filter((p) => matchesSegment(p, s)).length;
  return {
    "all-active": all.length,
    members: count("members"),
    subscribers: count("subscribers"),
    unsubscribed: count("unsubscribed"),
    leads: count("leads"),
    staff: 0,
    invited: count("invited"),
  };
}
