/**
 * A tiny fixed-window rate limiter for the public forms-upload endpoint.
 * In-memory and best-effort, same shape as modules/analytics/rate-limit.ts —
 * it protects a single instance from a chatty client, not a distributed
 * flood. Keyed by client IP since uploads are anonymous (no session id).
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Returns true if this key is allowed another upload right now. */
export function allowUpload(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }

  if (bucket.count >= MAX_PER_WINDOW) return false;
  bucket.count++;
  return true;
}
