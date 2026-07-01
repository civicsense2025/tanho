import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { DbAdapter, Project, Guide, ContentType, ContentEntry } from "@/lib/db/types";
import type { BackendHarness } from "../helpers/adapters";

/**
 * The DbAdapter contract. One suite, run against every backend, asserting all three
 * hand-written implementations (libsql, postgres, mongodb) observably agree. This is the
 * highest-ROI test in the codebase: everything rides on these adapters, they're implemented
 * three times by hand, and flipping DB_PROVIDER must never silently change behavior for a
 * white-label instance. It is also the prerequisite that makes the later adapter-dedup
 * refactor (Phase 6) safe.
 *
 * Call runAdapterContract(harness) from a per-backend test file.
 */

function sampleProject(over: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">> = {}) {
  return {
    slug: "my-project",
    title: "My Project",
    tagline: "A tagline",
    description: null,
    coverImage: null,
    logoUrl: null,
    tags: JSON.stringify(["a", "b"]),
    githubUrl: null,
    liveUrl: null,
    year: 2026,
    status: "draft" as const,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
    ogImage: null,
    canonicalUrl: null,
    noIndex: 0,
    ...over,
  };
}

function sampleGuide(over: Partial<Omit<Guide, "id" | "createdAt" | "updatedAt">> = {}) {
  return {
    slug: "sub-to-self",
    title: "Substack to Self-Hosted",
    tagline: null,
    summary: null,
    sourcePlatform: "substack",
    targetPlatform: "self-hosted",
    difficulty: "beginner" as const,
    effortHoursMin: 1,
    effortHoursMax: 4,
    costMinUsd: 0,
    costMaxUsd: 10,
    costPeriod: "one_time" as const,
    skillsRequired: JSON.stringify([]),
    requirements: JSON.stringify([]),
    coverImage: null,
    status: "published" as const,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
    ogImage: null,
    canonicalUrl: null,
    noIndex: 0,
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

    describe("Repository<T> CRUD", () => {
      it("create returns a generated id and ISO timestamps", async () => {
        const p = await db.projects.create(sampleProject({ slug: "crud-1" }));
        expect(p.id).toBeTruthy();
        expect(typeof p.id).toBe("string");
        expect(p.title).toBe("My Project");
        // Timestamps are ISO strings across all backends.
        expect(typeof p.createdAt).toBe("string");
        expect(new Date(p.createdAt).toISOString()).toBe(p.createdAt);
        expect(typeof p.updatedAt).toBe("string");
        await db.projects.delete(p.id);
      });

      it("get round-trips every field with correct scalar types", async () => {
        const created = await db.projects.create(sampleProject({ slug: "crud-2", year: 2025, sortOrder: 3, noIndex: 1 }));
        const got = await db.projects.get(created.id);
        expect(got).toBeDefined();
        expect(got!.slug).toBe("crud-2");
        expect(got!.tagline).toBe("A tagline");
        // Numeric columns must read back as numbers on every backend — the classic
        // SQLite-0/1 vs Mongo-native divergence this suite exists to catch.
        expect(typeof got!.year).toBe("number");
        expect(got!.year).toBe(2025);
        expect(typeof got!.sortOrder).toBe("number");
        expect(got!.sortOrder).toBe(3);
        expect(typeof got!.noIndex).toBe("number");
        expect(got!.noIndex).toBe(1);
        // Nullable columns stay null, not undefined or "".
        expect(got!.description).toBeNull();
        expect(got!.coverImage).toBeNull();
        await db.projects.delete(created.id);
      });

      it("get returns undefined for a missing id", async () => {
        expect(await db.projects.get("does-not-exist")).toBeUndefined();
      });

      it("update patches only given fields and bumps updatedAt", async () => {
        const p = await db.projects.create(sampleProject({ slug: "crud-3", title: "Before" }));
        const updated = await db.projects.update(p.id, { title: "After" });
        expect(updated.title).toBe("After");
        expect(updated.tagline).toBe("A tagline"); // untouched
        expect(updated.createdAt).toBe(p.createdAt); // never changes
        expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(p.updatedAt).getTime());
        await db.projects.delete(p.id);
      });

      it("delete removes the row", async () => {
        const p = await db.projects.create(sampleProject({ slug: "crud-4" }));
        await db.projects.delete(p.id);
        expect(await db.projects.get(p.id)).toBeUndefined();
      });
    });

    describe("list() query semantics", () => {
      const ids: string[] = [];
      beforeAll(async () => {
        for (let i = 0; i < 4; i++) {
          const p = await db.projects.create(
            sampleProject({ slug: `list-${i}`, title: `P${i}`, sortOrder: i, status: i % 2 === 0 ? "published" : "draft" })
          );
          ids.push(p.id);
        }
      });
      afterAll(async () => {
        for (const id of ids) await db.projects.delete(id);
      });

      it("filters by where equality", async () => {
        const drafts = await db.projects.list({ where: { status: "draft" } });
        expect(drafts.every((p) => p.status === "draft")).toBe(true);
        expect(drafts.map((p) => p.slug).sort()).toContain("list-1");
      });

      it("filters by where { in: [...] }", async () => {
        const got = await db.projects.list({ where: { slug: { in: ["list-0", "list-2"] } } });
        expect(got.map((p) => p.slug).sort()).toEqual(["list-0", "list-2"]);
      });

      it("orders by a field ascending and descending", async () => {
        const asc = await db.projects.list({
          where: { slug: { in: ["list-0", "list-1", "list-2", "list-3"] } },
          orderBy: [{ field: "sortOrder", direction: "asc" }],
        });
        expect(asc.map((p) => p.sortOrder)).toEqual([0, 1, 2, 3]);
        const desc = await db.projects.list({
          where: { slug: { in: ["list-0", "list-1", "list-2", "list-3"] } },
          orderBy: [{ field: "sortOrder", direction: "desc" }],
        });
        expect(desc.map((p) => p.sortOrder)).toEqual([3, 2, 1, 0]);
      });

      it("honors limit and offset", async () => {
        const page = await db.projects.list({
          where: { slug: { in: ["list-0", "list-1", "list-2", "list-3"] } },
          orderBy: [{ field: "sortOrder", direction: "asc" }],
          limit: 2,
          offset: 1,
        });
        expect(page.map((p) => p.sortOrder)).toEqual([1, 2]);
      });
    });

    describe("project blocks (sort-stable replace)", () => {
      it("replaces and returns blocks in sort order, empty clears", async () => {
        const p = await db.projects.create(sampleProject({ slug: "blocks-1" }));
        await db.replaceProjectBlocks(p.id, [
          { type: "text", content: JSON.stringify({ html: "one" }), sortOrder: 0 },
          { type: "image", content: JSON.stringify({ url: "/x.png" }), sortOrder: 1 },
        ]);
        const blocks = await db.getProjectBlocks(p.id);
        expect(blocks.map((b) => b.type)).toEqual(["text", "image"]);
        expect(blocks.map((b) => b.sortOrder)).toEqual([0, 1]);
        expect(blocks.every((b) => b.projectId === p.id)).toBe(true);
        expect(blocks.every((b) => typeof b.id === "string" && b.id.length > 0)).toBe(true);
        // Full replace: fewer blocks than before.
        await db.replaceProjectBlocks(p.id, [{ type: "text", content: "{}", sortOrder: 0 }]);
        expect(await db.getProjectBlocks(p.id)).toHaveLength(1);
        // Empty clears.
        await db.replaceProjectBlocks(p.id, []);
        expect(await db.getProjectBlocks(p.id)).toHaveLength(0);
        await db.projects.delete(p.id);
      });
    });

    describe("guide tags many-to-many", () => {
      it("sets and gets tags ordered by name; re-set replaces", async () => {
        const g = await db.guides.create(sampleGuide({ slug: "gt-1" }));
        const t1 = await db.upsertTag({ slug: "zeta", name: "Zeta" });
        const t2 = await db.upsertTag({ slug: "alpha", name: "Alpha" });
        await db.setGuideTags(g.id, [t1.id, t2.id]);
        const tags = await db.getGuideTags(g.id);
        expect(tags.map((t) => t.name)).toEqual(["Alpha", "Zeta"]); // name ASC
        await db.setGuideTags(g.id, [t1.id]);
        expect((await db.getGuideTags(g.id)).map((t) => t.slug)).toEqual(["zeta"]);
        await db.guides.delete(g.id);
      });
    });

    describe("listGuides filters + difficulty ranking", () => {
      const created: string[] = [];
      beforeAll(async () => {
        created.push((await db.guides.create(sampleGuide({ slug: "lg-beg", difficulty: "beginner", status: "published" }))).id);
        created.push((await db.guides.create(sampleGuide({ slug: "lg-adv", difficulty: "advanced", status: "published" }))).id);
        created.push((await db.guides.create(sampleGuide({ slug: "lg-draft", difficulty: "beginner", status: "draft" }))).id);
      });
      afterAll(async () => {
        for (const id of created) await db.guides.delete(id);
      });

      it("publishedOnly by default excludes drafts", async () => {
        const list = await db.listGuides();
        expect(list.some((g) => g.slug === "lg-draft")).toBe(false);
        expect(list.some((g) => g.slug === "lg-beg")).toBe(true);
      });

      it("publishedOnly:false includes drafts", async () => {
        const list = await db.listGuides({ publishedOnly: false });
        expect(list.some((g) => g.slug === "lg-draft")).toBe(true);
      });

      it("maxDifficulty caps the difficulty rank", async () => {
        const list = await db.listGuides({ maxDifficulty: "beginner" });
        expect(list.some((g) => g.slug === "lg-adv")).toBe(false);
        expect(list.some((g) => g.slug === "lg-beg")).toBe(true);
      });
    });

    describe("upsert idempotency", () => {
      it("upsertTag on the same slug updates rather than duplicates", async () => {
        const a = await db.upsertTag({ slug: "dup", name: "First" });
        const b = await db.upsertTag({ slug: "dup", name: "Second" });
        expect(b.name).toBe("Second");
        const all = await db.tags.list({ where: { slug: "dup" } });
        expect(all).toHaveLength(1);
      });

      it("upsertPlatform on the same slug updates rather than duplicates", async () => {
        await db.upsertPlatform({
          slug: "ghost", name: "Ghost", kind: "target", category: null, logoUrl: null,
          description: null, sortOrder: 0, officialUrl: null, isOpenSource: 1,
          pricingModel: "free_oss", pricingNotes: null, githubUrl: null,
        });
        const second = await db.upsertPlatform({
          slug: "ghost", name: "Ghost CMS", kind: "target", category: null, logoUrl: null,
          description: null, sortOrder: 0, officialUrl: null, isOpenSource: 1,
          pricingModel: "free_oss", pricingNotes: null, githubUrl: null,
        });
        expect(second.name).toBe("Ghost CMS");
        expect(await db.getPlatformBySlug("ghost")).toBeDefined();
        expect((await db.platforms.list({ where: { slug: "ghost" } }))).toHaveLength(1);
      });
    });

    describe("seo templates (singleton per entityType)", () => {
      it("upsert-by-entityType updates in place and get/list agree", async () => {
        const first = await db.upsertSeoTemplate("project", { titleTemplate: "{{title}} — A", descriptionTemplate: "d1" });
        expect(first.entityType).toBe("project");
        const second = await db.upsertSeoTemplate("project", { titleTemplate: "{{title}} — B", descriptionTemplate: "d2" });
        expect(second.titleTemplate).toBe("{{title}} — B");
        const got = await db.getSeoTemplate("project");
        expect(got!.titleTemplate).toBe("{{title}} — B");
        const projectRows = (await db.listSeoTemplates()).filter((t) => t.entityType === "project");
        expect(projectRows).toHaveLength(1);
      });
    });

    describe("logQuizResponse", () => {
      it("accepts arbitrary answer/recommendation payloads without throwing", async () => {
        await expect(
          db.logQuizResponse([{ questionId: "q1", value: "a" }], { guideSlug: "x" }, "substack")
        ).resolves.toBeUndefined();
      });
    });

    describe("newsletter: posts CRUD", () => {
      it("round-trips a post with correct scalar types", async () => {
        const p = await db.posts.create({
          slug: "hello-world", title: "Hello", subtitle: null, excerpt: "An excerpt",
          coverImage: null, status: "published", visibility: "public",
          publishedAt: "2026-01-01T00:00:00.000Z", sortOrder: 0,
          seoTitle: null, seoDescription: null, ogImage: null, canonicalUrl: null, noIndex: 0,
        });
        expect(p.id).toBeTruthy();
        const got = await db.posts.get(p.id);
        expect(got!.slug).toBe("hello-world");
        expect(got!.visibility).toBe("public");
        expect(typeof got!.sortOrder).toBe("number");
        expect(typeof got!.noIndex).toBe("number");
        expect(typeof got!.createdAt).toBe("string");
        await db.posts.delete(p.id);
      });
    });

    describe("newsletter: subscribers + delivery join", () => {
      it("bespoke email/token lookups and active filtering agree across backends", async () => {
        const active = await db.subscribers.create({
          email: "a@example.com", status: "active", confirmToken: null,
          unsubscribeToken: "unsub-token-a", source: "form",
        });
        const pending = await db.subscribers.create({
          email: "b@example.com", status: "pending", confirmToken: "confirm-token-b",
          unsubscribeToken: "unsub-token-b", source: "import",
        });

        expect((await db.getSubscriberByEmail("a@example.com"))!.id).toBe(active.id);
        expect((await db.getSubscriberByToken("confirm-token-b"))!.id).toBe(pending.id);
        expect((await db.getSubscriberByToken("unsub-token-a"))!.id).toBe(active.id);
        expect(await db.getSubscriberByToken("no-such-token")).toBeUndefined();

        const activeList = await db.listActiveSubscribers();
        expect(activeList.some((s) => s.id === active.id)).toBe(true);
        expect(activeList.some((s) => s.id === pending.id)).toBe(false);

        await db.subscribers.delete(active.id);
        await db.subscribers.delete(pending.id);
      });

      it("recordDelivery upserts idempotently and getDeliveriesForPost reads back", async () => {
        const post = await db.posts.create({
          slug: "issue-1", title: "Issue 1", subtitle: null, excerpt: null, coverImage: null,
          status: "published", visibility: "public", publishedAt: null, sortOrder: 0,
          seoTitle: null, seoDescription: null, ogImage: null, canonicalUrl: null, noIndex: 0,
        });
        const sub = await db.subscribers.create({
          email: "d@example.com", status: "active", confirmToken: null,
          unsubscribeToken: "unsub-d", source: "form",
        });

        await db.recordDelivery(post.id, sub.id, { status: "queued" });
        await db.recordDelivery(post.id, sub.id, { status: "sent", providerMessageId: "msg-1", sentAt: "2026-01-02T00:00:00.000Z" });

        const deliveries = await db.getDeliveriesForPost(post.id);
        // Idempotent on (post, subscriber): a single row, reflecting the latest patch.
        expect(deliveries).toHaveLength(1);
        expect(deliveries[0].status).toBe("sent");
        expect(deliveries[0].providerMessageId).toBe("msg-1");
        expect(deliveries[0].postId).toBe(post.id);
        expect(deliveries[0].subscriberId).toBe(sub.id);

        await db.subscribers.delete(sub.id);
        await db.posts.delete(post.id);
      });
    });

    describe("content types & entries", () => {
      it("creates a content type and round-trips its fields", async () => {
        const ct = await db.contentTypes.create({
          slug: "testimonial",
          name: "Testimonial",
          icon: null,
          fields: JSON.stringify([{ key: "quote", label: "Quote", kind: "text" }]),
          isBuiltIn: 0,
          sortOrder: 0,
          seoTitleTemplate: null,
          seoDescriptionTemplate: null,
        });
        expect(ct.id).toBeTruthy();
        expect(ct.slug).toBe("testimonial");
        const got = await db.contentTypes.get(ct.id);
        expect(got).toBeDefined();
        expect(got!.fields).toBe(JSON.stringify([{ key: "quote", label: "Quote", kind: "text" }]));
        await db.contentTypes.delete(ct.id);
      });

      it("creates an entry and filters by content type", async () => {
        const ct = await db.contentTypes.create({
          slug: "ct-filter-test",
          name: "Filter Test",
          icon: null,
          fields: "[]",
          isBuiltIn: 0,
          sortOrder: 0,
          seoTitleTemplate: null,
          seoDescriptionTemplate: null,
        });
        const entry = await db.contentEntries.create({
          contentTypeId: ct.id,
          slug: "entry-1",
          title: "Entry 1",
          status: "published",
          scheduledAt: null,
          publishedAt: null,
          sortOrder: 0,
          seoTitle: null,
          seoDescription: null,
          ogImage: null,
          canonicalUrl: null,
          noIndex: 0,
          data: JSON.stringify({}),
        });
        expect(entry.id).toBeTruthy();
        expect(entry.contentTypeId).toBe(ct.id);

        const entries = await db.listContentEntries({ contentTypeId: ct.id });
        expect(entries.some((e) => e.id === entry.id)).toBe(true);

        const published = await db.listContentEntries({ contentTypeId: ct.id, publishedOnly: true });
        expect(published.some((e) => e.id === entry.id)).toBe(true);

        const bySlug = await db.getContentEntry("ct-filter-test", "entry-1");
        expect(bySlug).toBeDefined();
        expect(bySlug!.id).toBe(entry.id);

        await db.contentEntries.delete(entry.id);
        await db.contentTypes.delete(ct.id);
      });

      it("content entry tags join works", async () => {
        const ct = await db.contentTypes.create({
          slug: "ct-tag-test",
          name: "Tag Test",
          icon: null,
          fields: "[]",
          isBuiltIn: 0,
          sortOrder: 0,
          seoTitleTemplate: null,
          seoDescriptionTemplate: null,
        });
        const entry = await db.contentEntries.create({
          contentTypeId: ct.id,
          slug: "tagged-entry",
          title: "Tagged",
          status: "draft",
          scheduledAt: null,
          publishedAt: null,
          sortOrder: 0,
          seoTitle: null,
          seoDescription: null,
          ogImage: null,
          canonicalUrl: null,
          noIndex: 0,
          data: JSON.stringify({}),
        });
        const tag = await db.upsertTag({ slug: "tag-test-1", name: "Tag Test 1" });
        await db.setContentEntryTags(entry.id, [tag.id]);
        const got = await db.getContentEntryTags(entry.id);
        expect(got).toHaveLength(1);
        expect(got[0].slug).toBe("tag-test-1");
        // Re-set replaces.
        const tag2 = await db.upsertTag({ slug: "tag-test-2", name: "Tag Test 2" });
        await db.setContentEntryTags(entry.id, [tag2.id]);
        const got2 = await db.getContentEntryTags(entry.id);
        expect(got2).toHaveLength(1);
        expect(got2[0].slug).toBe("tag-test-2");
        // Empty clears.
        await db.setContentEntryTags(entry.id, []);
        expect(await db.getContentEntryTags(entry.id)).toHaveLength(0);

        await db.contentEntries.delete(entry.id);
        await db.contentTypes.delete(ct.id);
      });
    });
  });
}
