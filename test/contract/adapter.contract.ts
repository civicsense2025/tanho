import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { DbAdapter, ContentType, ContentEntry, Collection } from "@/lib/db/types";
import type { BackendHarness } from "../helpers/adapters";

/**
 * The DbAdapter contract. One suite, run against every backend, asserting all three
 * hand-written implementations (libsql, postgres, mongodb) observably agree. This is the
 * highest-ROI test in the codebase: everything rides on these adapters, they're implemented
 * three times by hand, and flipping DB_PROVIDER must never silently change behavior for a
 * white-label instance.
 *
 * Call runAdapterContract(harness) from a per-backend test file.
 */

function sampleContentType(over: Partial<Omit<ContentType, "id" | "createdAt" | "updatedAt">> = {}) {
  return {
    slug: "test-type",
    name: "Test Type",
    icon: "🧪",
    fields: JSON.stringify([
      { key: "title", label: "Title", kind: "text" as const },
      { key: "body", label: "Body", kind: "richtext" as const },
    ]),
    isBuiltIn: 0,
    sortOrder: 0,
    seoTitleTemplate: null,
    seoDescriptionTemplate: null,
    ...over,
  };
}

function sampleContentEntry(contentTypeId: string, over: Partial<Omit<ContentEntry, "id" | "createdAt" | "updatedAt" | "contentTypeId">> = {}) {
  return {
    contentTypeId,
    slug: "test-entry",
    title: "Test Entry",
    status: "draft" as const,
    scheduledAt: null,
    publishedAt: null,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
    ogImage: null,
    canonicalUrl: null,
    noIndex: 0,
    data: JSON.stringify({ title: "Hello", body: "<p>World</p>" }),
    ...over,
  };
}

function sampleCollection(over: Partial<Omit<Collection, "id" | "createdAt" | "updatedAt">> = {}) {
  return {
    slug: "test-collection",
    name: "Test Collection",
    description: null,
    sortOrder: 0,
    ...over,
  };
}

export function runAdapterContract(harness: BackendHarness) {
  describe(`DbAdapter contract [${harness.name}]`, () => {
    let db: DbAdapter;

    beforeAll(async () => {
      db = await harness.make();
    });
    afterAll(async () => {
      await harness.teardown();
    });

    describe("Repository<T> CRUD (contentTypes)", () => {
      it("create returns a generated id and ISO timestamps", async () => {
        const ct = await db.contentTypes.create(sampleContentType({ slug: "crud-1" }));
        expect(ct.id).toBeTruthy();
        expect(typeof ct.id).toBe("string");
        expect(ct.name).toBe("Test Type");
        expect(typeof ct.createdAt).toBe("string");
        expect(new Date(ct.createdAt).toISOString()).toBe(ct.createdAt);
        expect(typeof ct.updatedAt).toBe("string");
        await db.contentTypes.delete(ct.id);
      });

      it("get round-trips every field with correct scalar types", async () => {
        const created = await db.contentTypes.create(sampleContentType({ slug: "crud-2", sortOrder: 3, isBuiltIn: 1 }));
        const got = await db.contentTypes.get(created.id);
        expect(got).toBeDefined();
        expect(got!.slug).toBe("crud-2");
        expect(got!.name).toBe("Test Type");
        expect(typeof got!.sortOrder).toBe("number");
        expect(got!.sortOrder).toBe(3);
        expect(typeof got!.isBuiltIn).toBe("number");
        expect(got!.isBuiltIn).toBe(1);
        expect(got!.icon).toBe("🧪");
        await db.contentTypes.delete(created.id);
      });

      it("get returns undefined for a missing id", async () => {
        expect(await db.contentTypes.get("does-not-exist")).toBeUndefined();
      });

      it("update patches only given fields and bumps updatedAt", async () => {
        const ct = await db.contentTypes.create(sampleContentType({ slug: "crud-3", name: "Before" }));
        const updated = await db.contentTypes.update(ct.id, { name: "After" });
        expect(updated.name).toBe("After");
        expect(updated.slug).toBe("crud-3"); // untouched
        expect(updated.createdAt).toBe(ct.createdAt); // never changes
        expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(ct.updatedAt).getTime());
        await db.contentTypes.delete(ct.id);
      });

      it("delete removes the row", async () => {
        const ct = await db.contentTypes.create(sampleContentType({ slug: "crud-4" }));
        await db.contentTypes.delete(ct.id);
        expect(await db.contentTypes.get(ct.id)).toBeUndefined();
      });
    });

    describe("list() query semantics (contentTypes)", () => {
      const ids: string[] = [];
      beforeAll(async () => {
        for (let i = 0; i < 4; i++) {
          const ct = await db.contentTypes.create(
            sampleContentType({ slug: `list-${i}`, name: `T${i}`, sortOrder: i })
          );
          ids.push(ct.id);
        }
      });
      afterAll(async () => {
        for (const id of ids) await db.contentTypes.delete(id);
      });

      it("filters by where equality", async () => {
        const got = await db.contentTypes.list({ where: { name: "T1" } });
        expect(got.every((c) => c.name === "T1")).toBe(true);
        expect(got.map((c) => c.slug).sort()).toContain("list-1");
      });

      it("filters by where { in: [...] }", async () => {
        const got = await db.contentTypes.list({ where: { slug: { in: ["list-0", "list-2"] } } });
        expect(got.map((c) => c.slug).sort()).toEqual(["list-0", "list-2"]);
      });

      it("orders by a field ascending and descending", async () => {
        const asc = await db.contentTypes.list({
          where: { slug: { in: ["list-0", "list-1", "list-2", "list-3"] } },
          orderBy: [{ field: "sortOrder", direction: "asc" }],
        });
        expect(asc.map((c) => c.sortOrder)).toEqual([0, 1, 2, 3]);
        const desc = await db.contentTypes.list({
          where: { slug: { in: ["list-0", "list-1", "list-2", "list-3"] } },
          orderBy: [{ field: "sortOrder", direction: "desc" }],
        });
        expect(desc.map((c) => c.sortOrder)).toEqual([3, 2, 1, 0]);
      });

      it("honors limit and offset", async () => {
        const page = await db.contentTypes.list({
          where: { slug: { in: ["list-0", "list-1", "list-2", "list-3"] } },
          orderBy: [{ field: "sortOrder", direction: "asc" }],
          limit: 2,
          offset: 1,
        });
        expect(page.map((c) => c.sortOrder)).toEqual([1, 2]);
      });
    });

    describe("contentEntries CRUD", () => {
      let typeId: string;
      const entryIds: string[] = [];

      beforeAll(async () => {
        const ct = await db.contentTypes.create(sampleContentType({ slug: "entry-crud-type" }));
        typeId = ct.id;
      });
      afterAll(async () => {
        for (const id of entryIds) await db.contentEntries.delete(id);
        await db.contentTypes.delete(typeId);
      });

      it("create returns a generated id and ISO timestamps", async () => {
        const e = await db.contentEntries.create(sampleContentEntry(typeId, { slug: "entry-1" }));
        expect(e.id).toBeTruthy();
        expect(typeof e.id).toBe("string");
        expect(e.title).toBe("Test Entry");
        expect(typeof e.createdAt).toBe("string");
        expect(new Date(e.createdAt).toISOString()).toBe(e.createdAt);
        entryIds.push(e.id);
      });

      it("get round-trips every field with correct scalar types", async () => {
        const created = await db.contentEntries.create(
          sampleContentEntry(typeId, { slug: "entry-2", status: "published", sortOrder: 5, noIndex: 1 })
        );
        entryIds.push(created.id);
        const got = await db.contentEntries.get(created.id);
        expect(got).toBeDefined();
        expect(got!.slug).toBe("entry-2");
        expect(got!.status).toBe("published");
        expect(typeof got!.sortOrder).toBe("number");
        expect(got!.sortOrder).toBe(5);
        expect(typeof got!.noIndex).toBe("number");
        expect(got!.noIndex).toBe(1);
        expect(got!.data).toBe(JSON.stringify({ title: "Hello", body: "<p>World</p>" }));
      });

      it("update patches only given fields and bumps updatedAt", async () => {
        const e = await db.contentEntries.create(sampleContentEntry(typeId, { slug: "entry-3", title: "Before" }));
        entryIds.push(e.id);
        const updated = await db.contentEntries.update(e.id, { title: "After" });
        expect(updated.title).toBe("After");
        expect(updated.slug).toBe("entry-3"); // untouched
        expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(e.updatedAt).getTime());
      });
    });

    describe("listContentEntries filter semantics", () => {
      let typeId: string;
      const entryIds: string[] = [];

      beforeAll(async () => {
        const ct = await db.contentTypes.create(sampleContentType({ slug: "entry-list-type" }));
        typeId = ct.id;
        for (let i = 0; i < 4; i++) {
          const e = await db.contentEntries.create(
            sampleContentEntry(typeId, {
              slug: `el-${i}`,
              title: `E${i}`,
              sortOrder: i,
              status: i % 2 === 0 ? "published" : "draft",
            })
          );
          entryIds.push(e.id);
        }
      });
      afterAll(async () => {
        for (const id of entryIds) await db.contentEntries.delete(id);
        await db.contentTypes.delete(typeId);
      });

      it("filters by contentTypeId", async () => {
        const got = await db.listContentEntries({ contentTypeId: typeId });
        expect(got.length).toBe(4);
        expect(got.every((e) => e.contentTypeId === typeId)).toBe(true);
      });

      it("publishedOnly filters status=published", async () => {
        const got = await db.listContentEntries({ contentTypeId: typeId, publishedOnly: true });
        expect(got.every((e) => e.status === "published")).toBe(true);
        expect(got.length).toBe(2);
      });

      it("filters by status", async () => {
        const got = await db.listContentEntries({ contentTypeId: typeId, status: "draft" });
        expect(got.every((e) => e.status === "draft")).toBe(true);
        expect(got.length).toBe(2);
      });
    });

    describe("getContentTypeBySlug + getContentEntry convenience", () => {
      let typeId: string;
      let entryId: string;

      beforeAll(async () => {
        const ct = await db.contentTypes.create(sampleContentType({ slug: "conv-type" }));
        typeId = ct.id;
        const e = await db.contentEntries.create(sampleContentEntry(typeId, { slug: "conv-entry" }));
        entryId = e.id;
      });
      afterAll(async () => {
        await db.contentEntries.delete(entryId);
        await db.contentTypes.delete(typeId);
      });

      it("getContentTypeBySlug returns the type", async () => {
        const got = await db.getContentTypeBySlug("conv-type");
        expect(got).toBeDefined();
        expect(got!.id).toBe(typeId);
        expect(got!.slug).toBe("conv-type");
      });

      it("getContentEntry resolves type+entry by slugs", async () => {
        const got = await db.getContentEntry("conv-type", "conv-entry");
        expect(got).toBeDefined();
        expect(got!.id).toBe(entryId);
        expect(got!.slug).toBe("conv-entry");
      });

      it("getContentEntry returns undefined for missing type", async () => {
        const got = await db.getContentEntry("no-such-type", "conv-entry");
        expect(got).toBeUndefined();
      });

      it("getContentEntry returns undefined for missing entry", async () => {
        const got = await db.getContentEntry("conv-type", "no-such-entry");
        expect(got).toBeUndefined();
      });
    });

    describe("content entry tags many-to-many", () => {
      let typeId: string;
      let entryId: string;
      const tagIds: string[] = [];

      beforeAll(async () => {
        const ct = await db.contentTypes.create(sampleContentType({ slug: "tag-type" }));
        typeId = ct.id;
        const e = await db.contentEntries.create(sampleContentEntry(typeId, { slug: "tag-entry" }));
        entryId = e.id;
        const t1 = await db.upsertTag({ slug: "zeta", name: "Zeta" });
        const t2 = await db.upsertTag({ slug: "alpha", name: "Alpha" });
        tagIds.push(t1.id, t2.id);
      });
      afterAll(async () => {
        await db.contentEntries.delete(entryId);
        await db.contentTypes.delete(typeId);
        for (const id of tagIds) {
          // Tags are upserted by slug; we clean by deleting via the tags repository
          const tags = await db.tags.list({ where: { id } });
          for (const t of tags) await db.tags.delete(t.id);
        }
      });

      it("sets and gets tags ordered by name; re-set replaces", async () => {
        await db.setContentEntryTags(entryId, tagIds);
        const got = await db.getContentEntryTags(entryId);
        expect(got.map((t) => t.name)).toEqual(["Alpha", "Zeta"]); // ordered by name
        // Re-set with fewer tags replaces, not appends.
        await db.setContentEntryTags(entryId, [tagIds[0]]);
        expect(await db.getContentEntryTags(entryId)).toHaveLength(1);
        // Empty clears.
        await db.setContentEntryTags(entryId, []);
        expect(await db.getContentEntryTags(entryId)).toHaveLength(0);
      });
    });

    describe("Repository<T> CRUD (collections)", () => {
      it("creates, gets, updates, deletes a collection", async () => {
        const created = await db.collections.create(sampleCollection({ slug: "coll-crud-1", name: "Before" }));
        expect(created.id).toBeTruthy();
        expect(created.slug).toBe("coll-crud-1");

        const got = await db.collections.get(created.id);
        expect(got?.name).toBe("Before");

        const updated = await db.collections.update(created.id, { name: "After" });
        expect(updated.name).toBe("After");
        expect((await db.collections.get(created.id))?.name).toBe("After");

        await db.collections.delete(created.id);
        expect(await db.collections.get(created.id)).toBeUndefined();
      });
    });

    describe("content entry collections many-to-many (sortOrder-carrying)", () => {
      let typeId: string;
      let entryId: string;
      const collectionIds: string[] = [];

      beforeAll(async () => {
        const ct = await db.contentTypes.create(sampleContentType({ slug: "coll-join-type" }));
        typeId = ct.id;
        const e = await db.contentEntries.create(sampleContentEntry(typeId, { slug: "coll-join-entry" }));
        entryId = e.id;
        const c1 = await db.collections.create(sampleCollection({ slug: "coll-join-1", name: "First" }));
        const c2 = await db.collections.create(sampleCollection({ slug: "coll-join-2", name: "Second" }));
        collectionIds.push(c1.id, c2.id);
      });
      afterAll(async () => {
        await db.contentEntries.delete(entryId);
        await db.contentTypes.delete(typeId);
        for (const id of collectionIds) await db.collections.delete(id);
      });

      it("sets and gets collections preserving explicit sortOrder; re-set replaces; empty clears", async () => {
        // Deliberately reversed insertion order vs. array order, to prove sortOrder (not name or
        // insertion order) drives the returned order -- the whole reason this join carries a
        // payload instead of being a plain unordered join like content_entry_tags.
        await db.setContentEntryCollections(entryId, [
          { collectionId: collectionIds[1], sortOrder: 0 },
          { collectionId: collectionIds[0], sortOrder: 1 },
        ]);
        const got = await db.getContentEntryCollections(entryId);
        expect(got.map((c) => c.collectionId)).toEqual([collectionIds[1], collectionIds[0]]);
        expect(got.map((c) => c.sortOrder)).toEqual([0, 1]);

        // Re-set with fewer entries replaces, not appends.
        await db.setContentEntryCollections(entryId, [{ collectionId: collectionIds[0], sortOrder: 0 }]);
        const afterReset = await db.getContentEntryCollections(entryId);
        expect(afterReset).toHaveLength(1);
        expect(afterReset[0].collectionId).toBe(collectionIds[0]);

        // Empty clears.
        await db.setContentEntryCollections(entryId, []);
        expect(await db.getContentEntryCollections(entryId)).toHaveLength(0);
      });
    });

    describe("platform upsert-by-slug", () => {
      const cleanupSlugs: string[] = [];

      afterAll(async () => {
        for (const slug of cleanupSlugs) {
          const list = await db.platforms.list({ where: { slug } });
          for (const p of list) await db.platforms.delete(p.id);
        }
      });

      it("inserts on first call, updates on second", async () => {
        const p1 = await db.upsertPlatform({ slug: "upsert-plat", name: "First", kind: "source", category: null, logoUrl: null, description: null, sortOrder: 0, officialUrl: null, isOpenSource: 0, pricingModel: null, pricingNotes: null, githubUrl: null });
        cleanupSlugs.push("upsert-plat");
        expect(p1.name).toBe("First");
        const p2 = await db.upsertPlatform({ slug: "upsert-plat", name: "Second", kind: "source", category: null, logoUrl: null, description: null, sortOrder: 0, officialUrl: null, isOpenSource: 0, pricingModel: null, pricingNotes: null, githubUrl: null });
        expect(p2.id).toBe(p1.id);
        expect(p2.name).toBe("Second");
      });
    });

    describe("SEO template singleton", () => {
      afterAll(async () => {
        // Clean up: upsert with empty to reset, or delete via list+delete
        const templates = await db.listSeoTemplates();
        for (const t of templates) {
          if (t.entityType === "project" && t.titleTemplate === "CONTRACT_TEST") {
            await db.upsertSeoTemplate("project", { titleTemplate: "", descriptionTemplate: "" });
          }
        }
      });

      it("upsert creates then updates the same row (keyed by entityType)", async () => {
        const t1 = await db.upsertSeoTemplate("project", { titleTemplate: "CONTRACT_TEST", descriptionTemplate: "desc1" });
        expect(t1.titleTemplate).toBe("CONTRACT_TEST");
        const t2 = await db.upsertSeoTemplate("project", { titleTemplate: "CONTRACT_TEST", descriptionTemplate: "desc2" });
        expect(t2.id).toBe(t1.id);
        expect(t2.descriptionTemplate).toBe("desc2");
      });

      it("getSeoTemplate returns by entityType", async () => {
        const got = await db.getSeoTemplate("project");
        expect(got).toBeDefined();
        expect(got!.titleTemplate).toBe("CONTRACT_TEST");
      });
    });

    describe("site settings singleton", () => {
      it("upsert creates then updates the same row (keyed by key)", async () => {
        const s1 = await db.upsertSiteSetting("contract_test_key", { value: "val1", isSecret: 0 });
        expect(s1.value).toBe("val1");
        const s2 = await db.upsertSiteSetting("contract_test_key", { value: "val2", isSecret: 0 });
        expect(s2.id).toBe(s1.id);
        expect(s2.value).toBe("val2");
        // Clean up
        await db.upsertSiteSetting("contract_test_key", { value: null, isSecret: 0 });
      });

      it("getSiteSetting returns by key", async () => {
        await db.upsertSiteSetting("contract_test_get", { value: "hello", isSecret: 0 });
        const got = await db.getSiteSetting("contract_test_get");
        expect(got).toBeDefined();
        expect(got!.value).toBe("hello");
        await db.upsertSiteSetting("contract_test_get", { value: null, isSecret: 0 });
      });
    });
  });
}
