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

const owner = { id: "u1", email: "owner@example.com", name: "Owner", role: "owner" as const };
vi.mock("@/modules/auth/guards", () => ({ requireUser: vi.fn(async () => owner) }));
vi.mock("@/modules/audit/log", () => ({ writeAudit: vi.fn(async () => undefined) }));
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return { ...actual, updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() };
});
vi.mock("@/modules/media/usage", () => ({ rebuildMediaUsage: vi.fn(async () => undefined) }));
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

/** A realistic RSS 2.0 feed: two published items, the first carrying a figure
 *  image card, both with real permalinks (for redirects). Uses the UPLOADED-XML
 *  path (args.xml) — no network is touched in a DB test. */
const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Example Blog</title>
    <link>https://old.example.com</link>
    <item>
      <title>Hello World</title>
      <link>https://old.example.com/2024/03/hello-world/</link>
      <guid>https://old.example.com/2024/03/hello-world/</guid>
      <content:encoded><![CDATA[<p>Intro</p><figure><img src="https://cdn.example.com/x.jpg" alt="X"/><figcaption>Cap</figcaption></figure><p>Outro</p>]]></content:encoded>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://old.example.com/second/</link>
      <guid>https://old.example.com/second/</guid>
      <description><![CDATA[<p>Second body.</p>]]></description>
    </item>
  </channel>
</rss>`;

describe("dryRunRssImport", () => {
  it("reports counts without writing anything to the database", async () => {
    const { dryRunRssImport } = await import("./review-actions");
    const result = await dryRunRssImport({ xml: RSS });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data!.itemCount).toBe(2);

    const pages = await testDb.query.pages.findMany();
    expect(pages).toHaveLength(0); // dry run wrote nothing
  });

  it("returns an error when neither url nor xml is provided", async () => {
    const { dryRunRssImport } = await import("./review-actions");
    const result = await dryRunRssImport({});
    expect(result.ok).toBe(false);
  });

  it("surfaces a parse error without throwing", async () => {
    const { dryRunRssImport } = await import("./review-actions");
    const result = await dryRunRssImport({ xml: "<html>not a feed</html>" });
    expect(result.ok).toBe(false);
  });
});

describe("commitRssImport", () => {
  it("creates pages, an image block, redirects, and a receipt", async () => {
    const { commitRssImport } = await import("./review-actions");
    const result = await commitRssImport({ xml: RSS });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Pages: both items, as published posts with slugs from the link paths.
    const pages = await testDb.query.pages.findMany();
    expect(pages.map((p) => p.route).sort()).toEqual(["/hello-world", "/second"]);

    const hello = pages.find((p) => p.route === "/hello-world")!;
    expect(hello.kind).toBe("post");
    expect(hello.status).toBe("published");

    // The first post's block tree = [richtext, image, richtext] with the real
    // remote image src preserved (figure/img → image card).
    const helloBlocks = await testDb.query.blockSets.findFirst({
      where: (b, { and, eq }) => and(eq(b.ownerType, "page"), eq(b.ownerId, hello.id), eq(b.variant, "published")),
    });
    const blocks = helloBlocks!.blocks as Array<{ type: string; content: Record<string, unknown> }>;
    expect(blocks.map((b) => b.type)).toEqual(["richtext", "image", "richtext"]);
    expect(blocks[1]!.content).toEqual({ src: "https://cdn.example.com/x.jpg", alt: "X", caption: "Cap" });

    // Redirects from the REAL <link> pathnames, not reconstructed.
    const redirectRows = await testDb.query.redirects.findMany();
    expect(redirectRows.map((r) => r.fromPath).sort()).toEqual(["/2024/03/hello-world/", "/second/"]);

    // Receipt.
    const receipt = await testDb.query.importReceipts.findFirst({
      where: (r, { eq }) => eq(r.id, result.data!.receiptId),
    });
    expect(receipt!.source).toBe("rss");
    expect(receipt!.tableCounts).toMatchObject({ pages: 2 });
  });

  it("is idempotent on a re-run: no duplicates, collisions reported", async () => {
    const { commitRssImport } = await import("./review-actions");
    await commitRssImport({ xml: RSS });
    const second = await commitRssImport({ xml: RSS });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    // Still only the two pages — the re-run created no duplicates.
    expect(await testDb.query.pages.findMany()).toHaveLength(2);

    const receipt = await testDb.query.importReceipts.findFirst({
      where: (r, { eq }) => eq(r.id, second.data!.receiptId),
    });
    expect(receipt!.unmapped.some((u) => u.kind === "route-collision")).toBe(true);
  });
});
