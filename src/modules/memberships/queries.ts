import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { memberships } from "@/modules/people/schema";

/**
 * The requesting person's own membership, or null. Callers pass a personId
 * resolved from the SESSION viewer — never from client input — so this never
 * exposes another person's row.
 */
export async function getMembershipForPerson(personId: string) {
  return (
    (await db.query.memberships.findFirst({
      where: and(
        eq(memberships.personId, personId),
        eq(memberships.status, "active"),
      ),
    })) ?? null
  );
}

/** Admin roll-up: active-member counts per tier. */
export async function membershipCountsByTier(): Promise<
  Array<{ tier: string; count: number }>
> {
  return db
    .select({ tier: memberships.tier, count: sql<number>`count(*)`.mapWith(Number) })
    .from(memberships)
    .where(eq(memberships.status, "active"))
    .groupBy(memberships.tier);
}
