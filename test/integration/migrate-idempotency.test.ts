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
      const ct = await db.contentTypes.create({
        slug: "idem-type", name: "Idem", icon: null,
        fields: JSON.stringify([]), isBuiltIn: 0, sortOrder: 0,
        seoTitleTemplate: null, seoDescriptionTemplate: null,
      });
      expect(await db.contentTypes.get(ct.id)).toBeDefined();
      await db.contentTypes.delete(ct.id);
    });

    it("seeds the built-in 'guide' content type with a body (block-list) field", async () => {
      // Regression test: the original guide seed omitted the `blocks` field that "project" and
      // "page" both got, silently breaking every guide's body section. This is asserted from a
      // FRESH migration run (harness.make() migrates a brand-new DB from scratch), so it also
      // proves the fix-migration's guard condition doesn't accidentally skip on a first-time
      // apply where the original seed and the fix both run in the same pass.
      const db = await harness.make();
      const types = await db.contentTypes.list({ where: { slug: "guide" } });
      expect(types).toHaveLength(1);
      const fields = JSON.parse(types[0].fields);
      expect(fields.some((f: { key: string; kind: string }) => f.key === "blocks" && f.kind === "block-list")).toBe(true);
    });

    it("marks sourcePlatform/targetPlatform for dynamic (platform-list) options, not a static list", async () => {
      // Regression test: these two fields were seeded as bare 'select' fields with no options
      // at all, leaving the admin dropdown permanently empty. dynamicOptions: "platforms" tells
      // EntryForm to populate them from listPlatforms() at render time instead.
      const db = await harness.make();
      const types = await db.contentTypes.list({ where: { slug: "guide" } });
      const fields: { key: string; dynamicOptions?: string }[] = JSON.parse(types[0].fields);
      const sourcePlatform = fields.find((f) => f.key === "sourcePlatform");
      const targetPlatform = fields.find((f) => f.key === "targetPlatform");
      expect(sourcePlatform?.dynamicOptions).toBe("platforms");
      expect(targetPlatform?.dynamicOptions).toBe("platforms");
    });

    it("seeds every built-in content type with a real, non-empty id", async () => {
      // Regression test: the mongo seed migration used $setOnInsert with no `id` field, and
      // mongoRepository's fromDoc() never synthesizes one from _id -- every built-in content
      // type had id === undefined on Mongo, breaking any content_entries.contentTypeId
      // reference, the admin UI, and every other id-keyed lookup for that entire backend.
      const db = await harness.make();
      const types = await db.contentTypes.list();
      expect(types.length).toBeGreaterThanOrEqual(5);
      for (const t of types) {
        expect(t.id, `content type "${t.slug}" has an invalid id`).toBeTruthy();
        expect(typeof t.id).toBe("string");
      }
    });
  });
}
