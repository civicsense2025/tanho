import { describe, it, expect, beforeAll } from "vitest";

/**
 * Unit tests for the admin-login rate limiter + failed-attempt lockout.
 * Env knobs are read at module load, so set them before importing.
 */
beforeAll(() => {
  process.env.ADMIN_LOGIN_MAX_ATTEMPTS = "5";
  process.env.ADMIN_LOGIN_LOCKOUT_SECONDS = "900";
});

const load = () => import("../../src/lib/rate-limit");

describe("rateLimit token bucket", () => {
  it("allows up to capacity then blocks", async () => {
    const { rateLimit } = await load();
    const cfg = { capacity: 3, refillPerSec: 0 };
    const key = `bucket-test-${Math.random()}`;
    expect(rateLimit(key, cfg)).toBe(true);
    expect(rateLimit(key, cfg)).toBe(true);
    expect(rateLimit(key, cfg)).toBe(true);
    expect(rateLimit(key, cfg)).toBe(false); // 4th exceeds capacity 3
  });
});

describe("failed-attempt lockout", () => {
  it("locks out after MAX_ATTEMPTS consecutive failures", async () => {
    const { recordFailedAttempt, lockoutRemainingMs } = await load();
    const key = `lockout-test-${Math.random()}`;
    expect(lockoutRemainingMs(key)).toBe(0);
    for (let i = 0; i < 4; i++) recordFailedAttempt(key);
    expect(lockoutRemainingMs(key)).toBe(0); // 4 < 5, not yet locked
    recordFailedAttempt(key); // 5th trips the lock
    const remaining = lockoutRemainingMs(key);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(900 * 1000);
  });

  it("clearFailedAttempts resets the counter (successful login)", async () => {
    const { recordFailedAttempt, clearFailedAttempts, lockoutRemainingMs } = await load();
    const key = `reset-test-${Math.random()}`;
    for (let i = 0; i < 4; i++) recordFailedAttempt(key);
    clearFailedAttempts(key);
    // After a reset, it takes another full MAX_ATTEMPTS to lock.
    for (let i = 0; i < 4; i++) recordFailedAttempt(key);
    expect(lockoutRemainingMs(key)).toBe(0);
  });
});
