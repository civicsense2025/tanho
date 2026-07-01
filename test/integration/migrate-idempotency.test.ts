import { describe, it, expect, afterAll } from "vitest";
import { libsqlHarness, mongoHarness } from "../helpers/adapters";

/**
 * Migrations are append-only and auto-run on first getAdapter(). The onboarding wizard may
 * trigger a run, and getAdapter() memoizes a single in-flight migrate() promise precisely
 * because a second concurrent run would race the _migrations primary key. So migrate() MUST
 * be safe to call repeatedly. This asserts a second migrate() is a no-op that leaves the DB
 * usable, on the two zero-infra backends.
 */

const harnesses = [libsqlHarness(), mongoHarness()];

afterAll(async () => {
  for (const h of harnesses) await h.teardown();
});

for (const harness of harnesses) {
  describe(`migrate() idempotency [${harness.name}]`, () => {
    it("running migrate twice does not throw and leaves the DB queryable", async () => {
      const db = await harness.make(); // make() already runs migrate() once
      await expect(db.migrate()).resolves.toBeUndefined(); // second run
      await expect(db.migrate()).resolves.toBeUndefined(); // third run
      // DB still works after repeated migrations.
      const p = await db.projects.create({
        slug: "idem", title: "Idem", tagline: null, description: null, coverImage: null,
        logoUrl: null, tags: "[]", githubUrl: null, liveUrl: null, year: 2026,
        status: "draft", sortOrder: 0, seoTitle: null, seoDescription: null, ogImage: null,
        canonicalUrl: null, noIndex: 0,
      });
      expect(await db.projects.get(p.id)).toBeDefined();
    });
  });
}
