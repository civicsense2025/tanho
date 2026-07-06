import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";
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
// next/cache: updateTag/cacheLife/cacheTag only work inside a real Next request.
// Stubbing them lets the real page queries run as plain DB reads every call.
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return { ...actual, updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() };
});
vi.mock("@/modules/media/usage", () => ({ rebuildMediaUsage: vi.fn(async () => undefined) }));
// The page publish path indexes into the real FTS table via its own client;
// mock the page + entry exports so the commit path no-ops them.
vi.mock("@/modules/search/index-document", () => ({
  indexPage: vi.fn(async () => undefined),
  removePageFromIndex: vi.fn(async () => undefined),
  indexEntry: vi.fn(async () => undefined),
  removeEntryFromIndex: vi.fn(async () => undefined),
}));

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

/** Build a Substack-shaped .zip File from a map of path → text. */
function makeZip(files: Record<string, string>): File {
  const encoded: Record<string, Uint8Array> = {};
  for (const [path, text] of Object.entries(files)) encoded[path] = strToU8(text);
  const bytes = zipSync(encoded);
  return new File([bytes.slice().buffer], "substack-export.zip", { type: "application/zip" });
}

const POSTS_CSV = `post_id,title,is_published
101,A Public Post,true
102,A Draft Post,false`;

const EMAIL_CSV = `email,name,active_subscription
free@example.com,Free Reader,false
paid@example.com,Paid Reader,true`;

function exportZip(): File {
  return makeZip({
    "posts/101.a-public-post.html": `<p>Public body.</p><div class="captioned-image-container"><figure><img src="https://cdn.substack.com/x.jpg" alt="X"/><figcaption>Cap</figcaption></figure></div>`,
    "posts/102.a-draft-post.html": `<p>Draft body.</p>`,
    "posts.csv": POSTS_CSV,
    "email_list.csv": EMAIL_CSV,
  });
}

describe("dryRunSubstackImport", () => {
  it("reports counts without writing anything to the database", async () => {
    const { dryRunSubstackImport } = await import("./review-actions");
    const result = await dryRunSubstackImport(exportZip());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data!.postCount).toBe(2);
    expect(result.data!.subscriberCount).toBe(2);
    expect(result.data!.paidCount).toBe(1);

    // Dry run wrote nothing.
    expect(await testDb.query.pages.findMany()).toHaveLength(0);
    expect(await testDb.query.people.findMany()).toHaveLength(0);
  });

  it("surfaces a parse error without throwing", async () => {
    const { dryRunSubstackImport } = await import("./review-actions");
    const garbage = new File([new Uint8Array([1, 2, 3, 4])], "nope.zip", { type: "application/zip" });
    const result = await dryRunSubstackImport(garbage);
    expect(result.ok).toBe(false);
  });
});

describe("commitSubstackImport", () => {
  it("creates pages, redirects, people (paid → member), and a receipt", async () => {
    const { commitSubstackImport } = await import("./review-actions");
    const result = await commitSubstackImport(exportZip());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Pages: the published post and the draft, at their slug routes.
    const pages = await testDb.query.pages.findMany();
    expect(pages.map((p) => p.route).sort()).toEqual(["/a-draft-post", "/a-public-post"]);
    const pub = pages.find((p) => p.route === "/a-public-post")!;
    expect(pub.kind).toBe("post");
    expect(pub.status).toBe("published");
    const draft = pages.find((p) => p.route === "/a-draft-post")!;
    expect(draft.status).toBe("draft");

    // The published post's block tree = [richtext, image] with the real src.
    const pubBlocks = await testDb.query.blockSets.findFirst({
      where: (b, { and, eq }) => and(eq(b.ownerType, "page"), eq(b.ownerId, pub.id), eq(b.variant, "published")),
    });
    const blocks = pubBlocks!.blocks as Array<{ type: string; content: Record<string, unknown> }>;
    expect(blocks.map((b) => b.type)).toEqual(["richtext", "image"]);
    expect(blocks[1]!.content).toEqual({ src: "https://cdn.substack.com/x.jpg", alt: "X", caption: "Cap" });

    // Redirects: from Substack's canonical /p/<slug> path.
    const redirectRows = await testDb.query.redirects.findMany();
    expect(redirectRows.map((r) => r.fromPath).sort()).toEqual(["/p/a-draft-post", "/p/a-public-post"]);

    // People: free → subscriber, paid → member.
    const persons = await testDb.query.people.findMany();
    expect(persons).toHaveLength(2);
    const byEmail = Object.fromEntries(persons.map((p) => [p.email, p]));
    expect(byEmail["free@example.com"]!.kind).toBe("subscriber");
    expect(byEmail["paid@example.com"]!.kind).toBe("member");

    // Receipt.
    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.source).toBe("substack");
    expect(receipt!.tableCounts).toEqual({ pages: 2, people: 2 });
    expect(receipt!.peopleCountBefore).toBe(0);
    expect(receipt!.peopleCountAfter).toBe(2);
  });

  it("is idempotent on a re-run: no duplicates, collisions reported", async () => {
    const { commitSubstackImport } = await import("./review-actions");
    await commitSubstackImport(exportZip());
    const second = await commitSubstackImport(exportZip());
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(await testDb.query.pages.findMany()).toHaveLength(2); // not 4
    expect(await testDb.query.people.findMany()).toHaveLength(2); // not 4

    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, second.data!.receiptId) });
    expect(receipt!.unmapped.some((u) => u.kind === "route-collision")).toBe(true);
    expect(receipt!.unmapped.some((u) => u.kind === "email-collision")).toBe(true);
  });

  it("does not throw when a subscriber email is taken by a pre-existing row", async () => {
    await testDb.insert(people).values({ email: "paid@example.com", name: "Already Here", kind: "subscriber" });
    const { commitSubstackImport } = await import("./review-actions");
    const result = await commitSubstackImport(exportZip());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const row = await testDb.query.people.findFirst({ where: (p, { eq }) => eq(p.email, "paid@example.com") });
    expect(row!.name).toBe("Already Here"); // untouched, not overwritten
    expect(row!.kind).toBe("subscriber"); // not upgraded to member
    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.unmapped.some((u) => u.kind === "email-collision")).toBe(true);
  });
});
