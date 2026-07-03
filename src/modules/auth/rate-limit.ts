import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { loginAttempts } from "./schema";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const keyFor = (email: string, ip: string) =>
  createHash("sha256").update(`${email.toLowerCase()}|${ip}`).digest("hex");

/**
 * Sliding-window login limiter, DB-backed so it holds on serverless.
 * Returns false when the caller must be refused.
 */
export async function allowLoginAttempt(email: string, ip: string): Promise<boolean> {
  const key = keyFor(email, ip);
  const now = Date.now();
  const row = await db.query.loginAttempts.findFirst({
    where: eq(loginAttempts.key, key),
  });

  if (!row || now - row.windowStart > WINDOW_MS) {
    await db
      .insert(loginAttempts)
      .values({ key, windowStart: now, count: 1 })
      .onConflictDoUpdate({
        target: loginAttempts.key,
        set: { windowStart: now, count: 1 },
      });
    return true;
  }
  if (row.count >= MAX_ATTEMPTS) return false;
  await db
    .update(loginAttempts)
    .set({ count: row.count + 1 })
    .where(eq(loginAttempts.key, key));
  return true;
}

export async function clearLoginAttempts(email: string, ip: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, keyFor(email, ip)));
}
