import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions } from "@/modules/auth/schema";
import { hashSessionToken } from "@/modules/auth/tokens";
import { memberships, people } from "./schema";

export const PERSON_COOKIE = "person_session";

/**
 * The public viewer: who is reading a page, and what they can unlock. Built
 * once per request from the person_session cookie. `tier`/`memberActive`
 * drive the server-enforced paywall — never trust the client for this.
 */
export type Viewer = {
  personId: string;
  email: string;
  name: string;
  memberActive: boolean;
  tier: string | null;
};

/** Resolves the current reader from the person_session cookie, or null. */
export async function getViewer(): Promise<Viewer | null> {
  const jar = await cookies();
  const token = jar.get(PERSON_COOKIE)?.value;
  if (!token) return null;

  const id = hashSessionToken(token);
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      personId: people.id,
      email: people.email,
      name: people.name,
      status: people.status,
    })
    .from(sessions)
    .innerJoin(people, eq(sessions.personId, people.id))
    .where(and(eq(sessions.id, id), eq(sessions.kind, "person")));

  if (!row || row.status === "unsubscribed" || row.expiresAt < Date.now()) return null;

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.personId, row.personId), eq(memberships.status, "active")),
  });

  return {
    personId: row.personId,
    email: row.email,
    name: row.name,
    memberActive: !!membership,
    tier: membership?.tier ?? null,
  };
}
