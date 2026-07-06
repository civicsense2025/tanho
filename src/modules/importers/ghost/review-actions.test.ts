import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { people } from "@/modules/people/schema";

let client: Client;
let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));

const owner = { id: "u1", email: "owner@example.com", name: "Owner", role: "owner" as const };
vi.mock("@/modules/auth/guards", () => ({ requireUser: vi.fn(async () => owner) }));
vi.mock("@/modules/audit/log", () => ({ writeAudit: vi.fn(async () => undefined) }));
// updateTag/cacheLife/cacheTag only work inside a real Next.js request —
// calling the real pages/actions.ts + pages/queries.ts from a plain Vitest
// run (no Next.js runtime) throws without this. media/usage's
// rebuildMediaUsage also needs a mock since it isn't exercised by these tests.
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return { ...actual, updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() };
});
vi.mock("@/modules/media/usage", () => ({ rebuildMediaUsage: vi.fn(async () => undefined) }));
// indexPage/removePageFromIndex write to the REAL search_index_fts table via
// their own independent libsql client (adapters/search/fts5.ts deliberately
// doesn't go through @/lib/db/client — see that file's own header comment on
// why), so neither is covered by this test's in-memory `db` swap above.
// Mocked for the same reason rebuildMediaUsage is: not exercised by these
// tests, and would otherwise write real rows into data/dev.db on every test
// run. Both exports are stubbed — deletePage (real modules/pages/actions.ts
// code, reached from this file's own orphaned-page cleanup path) calls
// removePageFromIndex too, and an incomplete mock throws "no export defined"
// there instead of silently no-op'ing.
vi.mock("@/modules/search/index-document", () => ({
  indexPage: vi.fn(async () => undefined),
  removePageFromIndex: vi.fn(async () => undefined),
}));

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

const contentExport = {
  meta: { exported_on: 1735689600000, version: "6.0.0" },
  data: {
    posts: [
      {
        id: "1",
        title: "A public essay",
        slug: "a-public-essay",
        html: "<p>Hello</p>",
        status: "published",
        visibility: "public",
      },
      {
        id: "2",
        title: "A members essay",
        slug: "a-members-essay",
        html: "<p>Secret</p>",
        status: "published",
        visibility: "members",
      },
    ],
  },
};

const membersCsv = [
  "id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at",
  "1,dana@example.com,Dana,,true,false,,2026-01-01T00:00:00.000Z,",
  "2,paying@example.com,Paying Reader,,true,true,,2026-01-01T00:00:00.000Z,",
].join("\n");

describe("dryRunGhostImport", () => {
  it("reports counts without writing anything to the database", async () => {
    const { dryRunGhostImport } = await import("./review-actions");
    const result = await dryRunGhostImport(contentExport, membersCsv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data!.postCount).toBe(2);
    expect(result.data!.memberCount).toBe(2);
    expect(result.data!.payingMemberCount).toBe(1);

    const peopleCount = (await testDb.query.people.findMany()).length;
    expect(peopleCount).toBe(0);
  });

  it("surfaces a parse error without throwing", async () => {
    const { dryRunGhostImport } = await import("./review-actions");
    const result = await dryRunGhostImport({ not: "a ghost export" }, null);
    expect(result.ok).toBe(false);
  });
});

describe("commitGhostImport", () => {
  it("creates a page per post, a redirect per post, and a receipt with correct counts", async () => {
    const { commitGhostImport } = await import("./review-actions");
    const result = await commitGhostImport(contentExport, membersCsv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const pages = await testDb.query.pages.findMany();
    expect(pages).toHaveLength(2);
    expect(pages.map((p) => p.route).sort()).toEqual(["/a-members-essay", "/a-public-essay"]);

    const redirectRows = await testDb.query.redirects.findMany();
    expect(redirectRows).toHaveLength(2);
    expect(redirectRows.map((r) => r.fromPath).sort()).toEqual(["/a-members-essay/", "/a-public-essay/"]);

    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt).toBeTruthy();
    expect(receipt!.peopleCountBefore).toBe(0);
    expect(receipt!.peopleCountAfter).toBe(2);
    expect(receipt!.membershipCountBefore).toBe(0);
    expect(receipt!.membershipCountAfter).toBe(1); // only the paying member gets a membership row
    expect(receipt!.tableCounts).toEqual({ posts: 2, members: 2 });
  });

  it("grants a comp membership only to the paying/complimentary member", async () => {
    const { commitGhostImport } = await import("./review-actions");
    await commitGhostImport(contentExport, membersCsv);

    const danaRow = await testDb.query.people.findFirst({ where: (p, { eq }) => eq(p.email, "dana@example.com") });
    const payingRow = await testDb.query.people.findFirst({ where: (p, { eq }) => eq(p.email, "paying@example.com") });
    expect(danaRow?.kind).toBe("subscriber");
    expect(payingRow?.kind).toBe("member");

    const danaMembership = await testDb.query.memberships.findFirst({ where: (m, { eq }) => eq(m.personId, danaRow!.id) });
    const payingMembership = await testDb.query.memberships.findFirst({ where: (m, { eq }) => eq(m.personId, payingRow!.id) });
    expect(danaMembership).toBeUndefined();
    expect(payingMembership?.status).toBe("active");
  });

  it("is idempotent on a re-run: skips existing routes/emails instead of duplicating", async () => {
    const { commitGhostImport } = await import("./review-actions");
    await commitGhostImport(contentExport, membersCsv);
    const second = await commitGhostImport(contentExport, membersCsv);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const pages = await testDb.query.pages.findMany();
    expect(pages).toHaveLength(2); // not 4 — the second run's creates were rejected as route collisions

    const people = await testDb.query.people.findMany();
    expect(people).toHaveLength(2); // not 4 — the second run's inserts were skipped as email collisions

    const secondReceipt = await testDb.query.importReceipts.findFirst({
      where: (r, { eq }) => eq(r.id, second.data!.receiptId),
    });
    expect(secondReceipt!.unmapped.some((u) => u.kind === "post-route-collision")).toBe(true);
    expect(secondReceipt!.unmapped.some((u) => u.kind === "member-email-collision")).toBe(true);
  });

  it("marks a redirect as resolved only when the target page actually published", async () => {
    const draftOnly = {
      meta: {},
      data: {
        posts: [
          { id: "3", title: "Still a draft", slug: "still-a-draft", html: "<p>wip</p>", status: "draft", visibility: "public" },
        ],
      },
    };
    const { commitGhostImport } = await import("./review-actions");
    const result = await commitGhostImport(draftOnly, null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.redirectStatuses).toEqual([
      { fromPath: "/still-a-draft/", toPath: "/still-a-draft", status: "broken" },
    ]);
  });

  it("does not throw when a member's email is taken by a row inserted between the dry-run check and the commit (race simulation)", async () => {
    // Simulates a concurrent writer (a second admin re-running the import, or a
    // normal signup) winning the unique-email race before this import's insert
    // runs — bypassing the importer's own findFirst-style pre-check entirely by
    // seeding the row directly, so the ONLY thing that can prevent an uncaught
    // unique-constraint throw here is the onConflictDoNothing on the insert itself.
    await testDb.insert(people).values({ email: "dana@example.com", name: "Already Here", kind: "subscriber" });

    const { commitGhostImport } = await import("./review-actions");
    const result = await commitGhostImport(contentExport, membersCsv);
    expect(result.ok).toBe(true); // must not throw / reject
    if (!result.ok) return;

    // The pre-existing row is untouched; the importer skipped it, not overwrote it.
    const danaRow = await testDb.query.people.findFirst({ where: (p, { eq }) => eq(p.email, "dana@example.com") });
    expect(danaRow?.name).toBe("Already Here");

    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.unmapped.some((u) => u.kind === "member-email-collision" && u.detail.includes("dana@example.com"))).toBe(
      true,
    );
  });

  it("records a post whose content genuinely can't be saved as unmapped, and cleans up the orphaned page — instead of silently publishing an empty page", async () => {
    // A tag-free blob has no top-level boundary the HTML chunker can safely
    // split on (see chunk-html.ts's fallback), so it stays one chunk and
    // still exceeds richtextSchema's cap — this is the correct, honest
    // outcome (never emit invalid HTML) for input this pathological. Real
    // Ghost exports are always tag-wrapped; see the next test for the
    // realistic "long post, still imports" case chunking exists for.
    const oversized = {
      meta: {},
      data: {
        posts: [
          {
            id: "4",
            title: "Way too long",
            slug: "way-too-long",
            html: "x".repeat(250_000),
            status: "published",
            visibility: "public",
          },
        ],
      },
    };
    const { commitGhostImport } = await import("./review-actions");
    const result = await commitGhostImport(oversized, null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.unmapped.some((u) => u.kind === "post-content-invalid")).toBe(true);
    expect(receipt!.tableCounts.posts).toBe(0); // not counted as imported since it never got real content

    // The page must not exist at all — createPage succeeded, but since its
    // content failed to save, the orphaned page is deleted rather than left
    // behind as a confusing empty draft.
    const pages = await testDb.query.pages.findMany();
    expect(pages).toHaveLength(0);
  });

  it("imports a realistically long, tag-wrapped post in full by splitting it across multiple richtext blocks", async () => {
    // A real Ghost post this long is always a sequence of <p>/<h2>/etc, not a
    // bare text blob — the chunker splits it at those boundaries, so this
    // now imports intact instead of failing (the "accept all lengths" fix).
    const paragraphs = Array.from({ length: 150 }, (_, i) => `<p>Paragraph ${i}: ${"x".repeat(2000)}</p>`);
    const longPost = {
      meta: {},
      data: {
        posts: [
          {
            id: "5",
            title: "A very long essay",
            slug: "a-very-long-essay",
            html: paragraphs.join(""),
            status: "published",
            visibility: "public",
          },
        ],
      },
    };
    const { commitGhostImport } = await import("./review-actions");
    const result = await commitGhostImport(longPost, null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.unmapped.some((u) => u.kind === "post-content-invalid")).toBe(false);
    expect(receipt!.tableCounts.posts).toBe(1);

    const page = await testDb.query.pages.findFirst({ where: (p, { eq }) => eq(p.route, "/a-very-long-essay") });
    expect(page?.status).toBe("published");

    const draft = await testDb.query.blockSets.findFirst({
      where: (b, { and, eq }) => and(eq(b.ownerType, "page"), eq(b.ownerId, page!.id), eq(b.variant, "published")),
    });
    const richtextBlocks = (draft!.blocks as Array<{ type: string; content: { html: string } }>).filter(
      (b) => b.type === "richtext",
    );
    expect(richtextBlocks.length).toBeGreaterThan(1); // split across multiple blocks
    expect(richtextBlocks.map((b) => b.content.html).join("")).toBe(paragraphs.join("")); // full content preserved
  });

  it("imports a post mixing plain text and a real Ghost image card as a native image block, end to end", async () => {
    const withImage = {
      meta: {},
      data: {
        posts: [
          {
            id: "6",
            title: "A post with a photo",
            slug: "a-post-with-a-photo",
            html:
              "<p>Some intro text.</p>" +
              '<figure class="kg-card kg-image-card"><img src="https://example.com/photo.jpg" alt="A photo"><figcaption>Photo caption</figcaption></figure>' +
              "<p>Some outro text.</p>",
            status: "published",
            visibility: "public",
          },
        ],
      },
    };
    const { commitGhostImport } = await import("./review-actions");
    const result = await commitGhostImport(withImage, null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const page = await testDb.query.pages.findFirst({ where: (p, { eq }) => eq(p.route, "/a-post-with-a-photo") });
    const draft = await testDb.query.blockSets.findFirst({
      where: (b, { and, eq }) => and(eq(b.ownerType, "page"), eq(b.ownerId, page!.id), eq(b.variant, "published")),
    });
    const blocks = draft!.blocks as Array<{ type: string; content: Record<string, unknown> }>;

    // Plain text before/after the card still comes through as richtext, but
    // the card itself is a real native image block, not sanitized HTML soup.
    expect(blocks.map((b) => b.type)).toEqual(["richtext", "image", "richtext"]);
    expect(blocks[1]!.content).toEqual({ src: "https://example.com/photo.jpg", alt: "A photo", caption: "Photo caption" });
  });
});
