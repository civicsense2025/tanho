import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";

let client: Client;
let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

describe("api-token rate limiter", () => {
  const IP = "203.0.113.7";

  it("does NOT throttle when nothing has been recorded (successful traffic)", async () => {
    const { isApiTokenRateLimited } = await import("./rate-limit");
    // Simulate many successful authenticated requests: the guard only ever CHECKS
    // (never records) on success, so the limiter must stay open no matter how many.
    for (let i = 0; i < 100; i++) {
      expect(await isApiTokenRateLimited(IP)).toBe(false);
    }
  });

  it("throttles only after 30 FAILED attempts in the window", async () => {
    const { isApiTokenRateLimited, recordFailedApiTokenAttempt } = await import("./rate-limit");
    for (let i = 0; i < 29; i++) await recordFailedApiTokenAttempt(IP);
    expect(await isApiTokenRateLimited(IP)).toBe(false); // 29 ≤ limit
    await recordFailedApiTokenAttempt(IP); // 30th
    expect(await isApiTokenRateLimited(IP)).toBe(true); // now refused
  });

  it("keys by IP — one IP's failures don't throttle another", async () => {
    const { isApiTokenRateLimited, recordFailedApiTokenAttempt } = await import("./rate-limit");
    for (let i = 0; i < 30; i++) await recordFailedApiTokenAttempt("198.51.100.1");
    expect(await isApiTokenRateLimited("198.51.100.1")).toBe(true);
    expect(await isApiTokenRateLimited("198.51.100.2")).toBe(false);
  });

  it("resets after the window elapses", async () => {
    const { isApiTokenRateLimited, recordFailedApiTokenAttempt } = await import("./rate-limit");
    for (let i = 0; i < 30; i++) await recordFailedApiTokenAttempt(IP);
    expect(await isApiTokenRateLimited(IP)).toBe(true);

    // Backdate the window start past WINDOW_MS (60s) so it's considered elapsed.
    const { createHash } = await import("node:crypto");
    const key = createHash("sha256").update(`api-token|${IP}`).digest("hex");
    await testDb
      .update(schema.apiTokenAttempts)
      .set({ windowStart: Date.now() - 61_000 })
      .where((await import("drizzle-orm")).eq(schema.apiTokenAttempts.key, key));

    expect(await isApiTokenRateLimited(IP)).toBe(false); // window elapsed → open again
  });
});
