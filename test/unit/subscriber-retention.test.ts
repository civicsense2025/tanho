import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Covers the subscriber deletion/retention-purge queries added for Phase 4.5
 * (data-subject erasure + retention). getAdapter() is a module-level
 * singleton keyed off env read at first call, so this test points
 * TURSO_DATABASE_URL at an isolated temp-file DB before importing the module
 * under test — the same pattern used by the hub's TOCTOU regression test.
 */
describe("subscriber deletion + retention purge", () => {
  let dir: string;
  let db: typeof import("../../src/lib/db");

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "tanho-retention-test-"));
    process.env.DB_PROVIDER = "turso";
    process.env.TURSO_DATABASE_URL = "file:" + join(dir, "test.db");
    db = await import("../../src/lib/db");
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  async function makeSubscriber(over: Partial<{ status: "pending" | "active" | "unsubscribed"; email: string }> = {}) {
    return db.createSubscriber({
      email: over.email ?? `sub-${Math.random().toString(36).slice(2)}@example.com`,
      status: over.status ?? "pending",
      confirmToken: null,
      unsubscribeToken: crypto.randomUUID(),
      source: "test",
    });
  }

  it("getSubscriberById + deleteSubscriber round-trip", async () => {
    const s = await makeSubscriber();
    expect(await db.getSubscriberById(s.id)).toBeDefined();
    await db.deleteSubscriber(s.id);
    expect(await db.getSubscriberById(s.id)).toBeUndefined();
  });

  it("purgeStaleSubscribers with a large positive cutoff leaves everything untouched (nothing is that old yet)", async () => {
    const pending = await makeSubscriber({ status: "pending" });
    const unsub = await makeSubscriber({ status: "unsubscribed" });

    const deletedCount = await db.purgeStaleSubscribers(365);

    expect(deletedCount).toBe(0);
    expect(await db.getSubscriberById(pending.id)).toBeDefined();
    expect(await db.getSubscriberById(unsub.id)).toBeDefined();
  });

  it("purgeStaleSubscribers with a far-future cutoff sweeps all pending/unsubscribed, never active", async () => {
    const pending = await makeSubscriber({ status: "pending" });
    const unsub = await makeSubscriber({ status: "unsubscribed" });
    const active = await makeSubscriber({ status: "active" });

    // -1 day => cutoff is in the future relative to "now", so every existing
    // pending/unsubscribed row's updatedAt is older than the cutoff.
    const deletedCount = await db.purgeStaleSubscribers(-1);

    expect(await db.getSubscriberById(pending.id)).toBeUndefined();
    expect(await db.getSubscriberById(unsub.id)).toBeUndefined();
    expect(await db.getSubscriberById(active.id)).toBeDefined();
    expect(deletedCount).toBeGreaterThanOrEqual(2);
  });
});
