import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { loginAttempts } from "@/modules/auth/schema";

/**
 * Per-IP donation-checkout limiter. Reuses the DB-backed `loginAttempts`
 * sliding-window table (a generic keyed counter, serverless-safe) — same
 * pattern as forms/rate-limit.ts's allowSubmission. startDonationCheckout
 * is a public, unauthenticated action that writes an order row and calls
 * Stripe on every call, so without this a single IP could spam both the DB
 * and the Stripe API. Returns false when a checkout attempt must be refused.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const keyFor = (ip: string) => createHash("sha256").update(`donation-checkout|${ip}`).digest("hex");

export async function allowDonationCheckout(ip: string): Promise<boolean> {
  const key = keyFor(ip);
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
