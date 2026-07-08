"use server";

import { and, eq, ne, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { writeAudit } from "@/modules/audit/log";
import { requireUser } from "./guards";
import { sessions } from "./schema";
import { ADMIN_COOKIE } from "./session";
import { hashSessionToken } from "./tokens";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export type SessionRow = {
  id: string;
  createdAt: number;
  expiresAt: number;
  ip: string | null;
  userAgent: string | null;
  label: string | null;
  isCurrent: boolean;
};

/**
 * Lists active admin sessions for a user. Without `team:manage`, a caller can
 * only list their own sessions (CWE-639 IDOR). The current session — the one
 * whose cookie token hashes to a row's id — is flagged with `isCurrent`.
 */
export async function listSessions(userId?: string): Promise<Result<SessionRow[]>> {
  const caller = await requireUser();
  const target = userId ?? caller.id;

  // IDOR guard: only team:manage holders may inspect another user's sessions.
  if (target !== caller.id && !caller.permissions.has("team:manage")) {
    return { ok: false, error: "Forbidden" };
  }

  const jar = await cookies();
  const cookieToken = jar.get(ADMIN_COOKIE)?.value;
  const currentId = cookieToken ? hashSessionToken(cookieToken) : null;

  const rows = await db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
      ip: sessions.ip,
      userAgent: sessions.userAgent,
      label: sessions.label,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.kind, "admin"),
        eq(sessions.userId, target),
        gt(sessions.expiresAt, Date.now()),
      ),
    )
    .all();

  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      ip: r.ip,
      userAgent: r.userAgent,
      label: r.label,
      isCurrent: r.id === currentId,
    })),
  };
}

/**
 * Revokes a single admin session by id. The caller must own the session or
 * hold `team:manage` (CWE-639 IDOR). The current session can't be revoked
 * here — use `logoutAction` for that, which also clears the cookie.
 */
export async function revokeSession(sessionId: string): Promise<Result> {
  const caller = await requireUser();

  const [row] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  if (!row) return { ok: false, error: "Session not found" };

  // IDOR guard: only the owner or a team:manage holder may revoke.
  if (row.userId !== caller.id && !caller.permissions.has("team:manage")) {
    return { ok: false, error: "Forbidden" };
  }

  const jar = await cookies();
  const cookieToken = jar.get(ADMIN_COOKIE)?.value;
  const currentId = cookieToken ? hashSessionToken(cookieToken) : null;
  if (sessionId === currentId) {
    return { ok: false, error: "Use logout to end your current session" };
  }

  await db.delete(sessions).where(eq(sessions.id, sessionId));
  await writeAudit({ userId: caller.id, action: "session.revoke", ownerId: sessionId });
  return { ok: true };
}

/**
 * Revokes every admin session for the caller except the current one. Always
 * scoped to the caller — no userId argument, so no IDOR surface.
 */
export async function revokeOtherSessions(): Promise<Result> {
  const caller = await requireUser();

  const jar = await cookies();
  const cookieToken = jar.get(ADMIN_COOKIE)?.value;
  const currentId = cookieToken ? hashSessionToken(cookieToken) : null;

  await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.kind, "admin"),
        eq(sessions.userId, caller.id),
        currentId ? ne(sessions.id, currentId) : undefined,
      ),
    );
  await writeAudit({ userId: caller.id, action: "session.revoke-others" });
  return { ok: true };
}
