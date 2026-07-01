/**
 * Minimal in-memory rate limiting + failed-attempt lockout for sensitive routes
 * (currently the admin login). Mirrors the token-bucket pattern used server-side
 * elsewhere in the stack.
 *
 * SCOPE: intentionally in-memory and per-process. The template is designed to run
 * as a single instance (one Vercel function / one server), where this is enough
 * to stop online brute-force and credential stuffing. It is NOT a distributed
 * limiter — a multi-instance deployment would want a shared store (Redis/KV); the
 * call sites wouldn't change. Keys are arbitrary strings composed by the caller
 * (e.g. an IP), so no PII beyond what the caller passes is stored.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  /** Max burst. */
  capacity: number;
  /** Tokens replenished per second. */
  refillPerSec: number;
}

/** Returns true if the request is allowed (consuming one token), false if the
 *  bucket for `key` is empty. Callers return a generic 429 on false. */
export function rateLimit(key: string, cfg: RateLimitConfig): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: cfg.capacity, lastRefill: now };
    buckets.set(key, bucket);
  }
  const elapsedSec = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(cfg.capacity, bucket.tokens + elapsedSec * cfg.refillPerSec);
  bucket.lastRefill = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

// --- Failed-attempt lockout (for login) -------------------------------------

interface AttemptState {
  fails: number;
  /** Epoch ms until which the key is locked out; 0 = not locked. */
  lockedUntil: number;
}

const attempts = new Map<string, AttemptState>();

/** Env-tunable knobs with safe defaults. Parsed once at module load. */
function intFromEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}
const MAX_ATTEMPTS = intFromEnv("ADMIN_LOGIN_MAX_ATTEMPTS", 5);
const LOCKOUT_MS = intFromEnv("ADMIN_LOGIN_LOCKOUT_SECONDS", 15 * 60) * 1000;

/** Returns the remaining lockout in ms if `key` is currently locked out, else 0. */
export function lockoutRemainingMs(key: string): number {
  const s = attempts.get(key);
  if (!s || s.lockedUntil === 0) return 0;
  const remaining = s.lockedUntil - Date.now();
  if (remaining <= 0) {
    // Lock expired — clear it so the next attempt starts fresh.
    attempts.delete(key);
    return 0;
  }
  return remaining;
}

/** Records a failed attempt for `key`. After MAX_ATTEMPTS consecutive failures
 *  the key is locked out for LOCKOUT_MS. */
export function recordFailedAttempt(key: string): void {
  const s = attempts.get(key) ?? { fails: 0, lockedUntil: 0 };
  s.fails += 1;
  if (s.fails >= MAX_ATTEMPTS) {
    s.lockedUntil = Date.now() + LOCKOUT_MS;
    s.fails = 0; // reset the counter; the lock is now what gates further attempts
  }
  attempts.set(key, s);
}

/** Clears failed-attempt state for `key` (call on successful auth). */
export function clearFailedAttempts(key: string): void {
  attempts.delete(key);
}
