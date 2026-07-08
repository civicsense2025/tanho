import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { loginAttempts } from "@/modules/auth/schema";

/**
 * Per-target + IP review submission limiter. Reuses the DB-backed
 * `loginAttempts` sliding-window table (same generic keyed counter the forms
 * module uses) so reviews don't need their own. Returns false when a
 * submission must be refused. Tighter than forms: 3 per 10 min per target+IP,
 * since review spam is higher-stakes than form spam.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS = 3;

const keyFor = (targetType: string, targetId: string, ip: string) =>
  createHash("sha256").update(`review:${targetType}:${targetId}|${ip}`).digest("hex");

export async function allowReviewSubmission(
  targetType: string,
  targetId: string,
  ip: string,
): Promise<boolean> {
  const key = keyFor(targetType, targetId, ip);
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
