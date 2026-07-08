import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, users } from "./schema";
import { generateSessionToken, hashSessionToken } from "./tokens";
import { resolvePermissions } from "./guards";

export const ADMIN_COOKIE = "admin_session";
const SESSION_DAYS = 30;
const ms = (days: number) => days * 24 * 60 * 60 * 1000;

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "editor";
  permissions: Set<string>;
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
      roleId: users.roleId,
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
  // Load the permission set once per request so downstream guards
  // (requireUser/requirePermission) don't re-query on every call.
  const permissions = await resolvePermissions(row.roleId);
  return { id: row.userId, email: row.email, name: row.name, role: row.role, permissions };
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
  }
  jar.delete(ADMIN_COOKIE);
}

/**
 * Destroy EVERY admin session for a user — used by password reset, which is often
 * a response to a suspected compromise, so any existing (possibly attacker)
 * session shouldn't survive it. Unlike `destroyAdminSession`, this doesn't touch
 * the current request's cookie; the caller redirects to login regardless, which
 * naturally drops any stale cookie on next visit.
 */
export async function destroyAllSessionsForUser(userId: string) {
  await db.delete(sessions).where(and(eq(sessions.kind, "admin"), eq(sessions.userId, userId)));
}
