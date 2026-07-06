import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { apiTokenAttempts } from "./schema";

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 30;

/**
 * DB-backed sliding-window limiter for bearer-token auth, same shape as
 * auth/rate-limit.ts and data-sources/rate-limit.ts so it holds on serverless.
 * Keyed by IP only (not by token or user) — a bearer-token brute-forcer starts
 * with no known valid token or user identity, unlike the cookie-login limiter
 * which can key on the submitted email.
 *
 * IMPORTANT: this limiter counts only FAILED auth attempts (a missing/invalid/
 * expired token — a credential-guessing signal). A SUCCESSFUL authenticated
 * request never increments it, so a legitimate client making many calls (e.g.
 * the migration tool importing hundreds of pages) is never throttled, while a
 * brute-forcer still trips the limit after MAX_ATTEMPTS_PER_WINDOW bad tries.
 * Callers must therefore: check `isApiTokenRateLimited` first (fail fast), then
 * call `recordFailedApiTokenAttempt` on each auth failure.
 */

function keyFor(ip: string): string {
  return createHash("sha256").update(`api-token|${ip}`).digest("hex");
}

/**
 * True when this IP has already made MAX_ATTEMPTS_PER_WINDOW failed attempts in
 * the current window and must be refused. Read-only — never increments, so
 * calling it on every request (including successful ones) is free of throttling
 * side effects.
 */
export async function isApiTokenRateLimited(ip: string): Promise<boolean> {
  const row = await db.query.apiTokenAttempts.findFirst({
    where: eq(apiTokenAttempts.key, keyFor(ip)),
  });
  if (!row) return false;
  if (Date.now() - row.windowStart > WINDOW_MS) return false; // window elapsed → clear
  return row.count >= MAX_ATTEMPTS_PER_WINDOW;
}

/**
 * Record one FAILED bearer-token auth attempt for this IP (missing/invalid/
 * expired token). Starts a fresh window if none is active or the current one has
 * elapsed. Call ONLY on auth failure — never on a successful request.
 */
export async function recordFailedApiTokenAttempt(ip: string): Promise<void> {
  const key = keyFor(ip);
  const now = Date.now();
  const row = await db.query.apiTokenAttempts.findFirst({ where: eq(apiTokenAttempts.key, key) });

  if (!row || now - row.windowStart > WINDOW_MS) {
    await db
      .insert(apiTokenAttempts)
      .values({ key, windowStart: now, count: 1 })
      .onConflictDoUpdate({ target: apiTokenAttempts.key, set: { windowStart: now, count: 1 } });
    return;
  }
  await db
    .update(apiTokenAttempts)
    .set({ count: row.count + 1 })
    .where(eq(apiTokenAttempts.key, key));
}
