import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { analyticsEvents } from "@/modules/analytics/schema";
import { memberships, people } from "./schema";

// Real DB-backed test: quietReaders() is a group-by aggregate over two real
// tables, not a pure function — a mock can't stand in for SQL semantics
// (window boundaries, sum/max over joined rows) without re-deriving them.
// Each test gets a FRESH in-memory libsql DB, migrated from the same
// drizzle/*.sql files the real dev/prod DB uses, so schema drift here would
// fail loudly instead of silently mismatching, and no rows leak test-to-test.
const DAY_MS = 24 * 60 * 60 * 1000;

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

async function seedPerson(id: string, email: string, name: string) {
  await testDb.insert(people).values({ id, email, name });
}

async function seedMembership(personId: string, tier: string) {
  await testDb.insert(memberships).values({ personId, tier, status: "active" });
}

async function seedPageviews(personId: string, timestamps: number[]) {
  for (const at of timestamps) {
    await testDb.insert(analyticsEvents).values({ name: "pageview", personId, at });
  }
}

describe("quietReaders", () => {
  it("flags a member whose recent views dropped sharply vs. their prior baseline", async () => {
    const now = Date.now();
    await seedPerson("p1", "dana@example.com", "Dana");
    await seedMembership("p1", "member");
    // 10 views 31-60 days ago, 0 views in the last 30 days — a real drop.
    await seedPageviews(
      "p1",
      Array.from({ length: 10 }, (_, i) => now - (35 + i) * DAY_MS),
    );

    const { quietReaders } = await import("./digest");
    const rows = await quietReaders();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ personId: "p1", tier: "member", recentViews: 0, priorViews: 10 });
  });

  it("does not flag a member whose views stayed steady", async () => {
    const now = Date.now();
    await seedPerson("p2", "steady@example.com", "Steady Reader");
    await seedMembership("p2", "member");
    await seedPageviews("p2", [now - 5 * DAY_MS, now - 40 * DAY_MS]);

    const { quietReaders } = await import("./digest");
    const rows = await quietReaders();
    expect(rows.find((r) => r.personId === "p2")).toBeUndefined();
  });

  it("ignores a person with too few prior views to be a real baseline (noise guard)", async () => {
    const now = Date.now();
    await seedPerson("p3", "noise@example.com", "Noise");
    await seedMembership("p3", "member");
    // 1 prior view, 0 recent — a 100% drop by ratio, but not a real signal.
    await seedPageviews("p3", [now - 45 * DAY_MS]);

    const { quietReaders } = await import("./digest");
    const rows = await quietReaders();
    expect(rows.find((r) => r.personId === "p3")).toBeUndefined();
  });

  it("ignores people without an active membership", async () => {
    const now = Date.now();
    await seedPerson("p4", "lapsed@example.com", "Lapsed");
    await testDb.insert(memberships).values({ personId: "p4", tier: "member", status: "canceled" });
    await seedPageviews(
      "p4",
      Array.from({ length: 10 }, (_, i) => now - (35 + i) * DAY_MS),
    );

    const { quietReaders } = await import("./digest");
    const rows = await quietReaders();
    expect(rows.find((r) => r.personId === "p4")).toBeUndefined();
  });

  it("ranks steepest drop first, ties broken by larger prior audience", async () => {
    const now = Date.now();
    await seedPerson("p5", "half-drop@example.com", "Half Drop");
    await seedMembership("p5", "member");
    // Prior 10, recent 4 — ratio 0.4, does NOT clear the default 0.34 threshold.
    await seedPageviews(
      "p5",
      Array.from({ length: 10 }, (_, i) => now - (35 + i) * DAY_MS),
    );
    await seedPageviews("p5", Array.from({ length: 4 }, (_, i) => now - (1 + i) * DAY_MS));

    await seedPerson("p6", "full-drop@example.com", "Full Drop");
    await seedMembership("p6", "member");
    // Prior 20, recent 0 — ratio 0, clears the threshold and has a bigger baseline.
    await seedPageviews(
      "p6",
      Array.from({ length: 20 }, (_, i) => now - (35 + i) * DAY_MS),
    );

    const { quietReaders } = await import("./digest");
    const rows = await quietReaders();
    const ids = rows.map((r) => r.personId);
    expect(ids).toEqual(["p6"]);
  });
});
