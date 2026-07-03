import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions } from "@/modules/auth/schema";
import { generateSessionToken, hashSessionToken } from "@/modules/auth/tokens";
import { getViewer, PERSON_COOKIE, type Viewer } from "./viewer";

const SESSION_DAYS = 30;
const ms = (days: number) => days * 24 * 60 * 60 * 1000;

/**
 * Reader sessions — mirrors the admin session lifecycle (modules/auth/session)
 * but writes the shared `sessions` table with kind="person" + personId, and
 * sets the person_session cookie. The opaque token lives in the cookie; only
 * its SHA-256 is stored, so a DB leak alone cannot forge a session.
 */
export async function createPersonSession(
  personId: string,
  meta?: { ip?: string; userAgent?: string },
) {
  const token = generateSessionToken();
  await db.insert(sessions).values({
    id: hashSessionToken(token),
    kind: "person",
    personId,
    expiresAt: Date.now() + ms(SESSION_DAYS),
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  const jar = await cookies();
  jar.set(PERSON_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ms(SESSION_DAYS) / 1000,
  });
}

export async function destroyPersonSession() {
  const jar = await cookies();
  const token = jar.get(PERSON_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
  }
  jar.delete(PERSON_COOKIE);
}

/**
 * Reader-page guard: resolves the current viewer or redirects to /signin.
 * getViewer already validates the session (kind, expiry, non-unsubscribed).
 */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  return viewer;
}
