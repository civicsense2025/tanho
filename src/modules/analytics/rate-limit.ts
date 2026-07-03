/**
 * A tiny fixed-window rate limiter for the public track beacon. In-memory and
 * best-effort — it protects a single instance from a chatty client, not a
 * distributed flood (that's the CDN/WAF's job). Keyed by the anon session id.
 */
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 30;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Returns true if this key is allowed another event right now. */
export function allowEvent(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic sweep so the map can't grow unbounded.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }

  if (bucket.count >= MAX_PER_WINDOW) return false;
  bucket.count++;
  return true;
}
