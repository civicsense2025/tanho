import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dataSourceQueryAttempts } from "./schema";

const WINDOW_MS = 60 * 1000;
const MAX_QUERIES_PER_WINDOW = 60;
const MAX_MUTATIONS_PER_WINDOW = 20;

function keyFor(scope: string, id: string): string {
  return createHash("sha256").update(`${scope}|${id}`).digest("hex");
}

/**
 * DB-backed sliding-window limiter, same shape as auth/rate-limit.ts so it
 * holds on serverless. Returns false when the caller must be refused.
 */
async function allowAttempt(key: string, max: number): Promise<boolean> {
  const now = Date.now();
  const row = await db.query.dataSourceQueryAttempts.findFirst({
    where: eq(dataSourceQueryAttempts.key, key),
  });

  if (!row || now - row.windowStart > WINDOW_MS) {
    await db
      .insert(dataSourceQueryAttempts)
      .values({ key, windowStart: now, count: 1 })
      .onConflictDoUpdate({
        target: dataSourceQueryAttempts.key,
        set: { windowStart: now, count: 1 },
      });
    return true;
  }
  if (row.count >= max) return false;
  await db
    .update(dataSourceQueryAttempts)
    .set({ count: row.count + 1 })
    .where(eq(dataSourceQueryAttempts.key, key));
  return true;
}

/** Rate-limits resolved block queries against a given connection. */
export function allowDataSourceQuery(connectionId: string): Promise<boolean> {
  return allowAttempt(keyFor("query", connectionId), MAX_QUERIES_PER_WINDOW);
}

/** Rate-limits admin connection create/update/test actions per caller. */
export function allowDataSourceMutation(userId: string): Promise<boolean> {
  return allowAttempt(keyFor("mutation", userId), MAX_MUTATIONS_PER_WINDOW);
}
