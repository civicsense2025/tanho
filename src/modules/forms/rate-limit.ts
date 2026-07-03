import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { loginAttempts } from "@/modules/auth/schema";

/**
 * Per-form + IP submission limiter. Reuses the DB-backed `loginAttempts`
 * sliding-window table (it's a generic keyed counter, serverless-safe) so
 * forms don't need their own. Returns false when a submission must be refused.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS = 8;

const keyFor = (formId: string, ip: string) =>
  createHash("sha256").update(`form:${formId}|${ip}`).digest("hex");

export async function allowSubmission(formId: string, ip: string): Promise<boolean> {
  const key = keyFor(formId, ip);
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
  if (row.count >= MAX_SUBMISSIONS) return false;
  await db
    .update(loginAttempts)
    .set({ count: row.count + 1 })
    .where(eq(loginAttempts.key, key));
  return true;
}
