import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, users } from "./schema";
import { generateSessionToken, hashSessionToken } from "./tokens";

export const ADMIN_COOKIE = "admin_session";
const SESSION_DAYS = 30;
const ms = (days: number) => days * 24 * 60 * 60 * 1000;

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "editor";
};

export async function createAdminSession(userId: string, meta?: { ip?: string; userAgent?: string }) {
  const token = generateSessionToken();
  await db.insert(sessions).values({
    id: hashSessionToken(token),
    kind: "admin",
    userId,
    expiresAt: Date.now() + ms(SESSION_DAYS),
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ms(SESSION_DAYS) / 1000,
  });
}

/**
 * Resolves the current admin user from the session cookie, or null.
 * Sliding expiry: sessions past half-life are extended on use.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const id = hashSessionToken(token);
  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id));

  if (!row || row.status !== "active") return null;
  if (row.expiresAt < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (row.expiresAt - Date.now() < ms(SESSION_DAYS / 2)) {
    await db
      .update(sessions)
      .set({ expiresAt: Date.now() + ms(SESSION_DAYS) })
      .where(eq(sessions.id, id));
  }
  return { id: row.userId, email: row.email, name: row.name, role: row.role };
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
  }
  jar.delete(ADMIN_COOKIE);
}
