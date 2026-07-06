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

/** A Squarespace WXR export: WP-compatible, but the post body uses Squarespace
 *  block markup — a sqs-block-image wrapper with a lazy-loaded data-src image
 *  behind a data: placeholder, and a ?format= CDN query. */
const SQSP_WXR = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:wp="http://wordpress.org/export/1.2/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <wp:author>
    <wp:author_login><![CDATA[amy]]></wp:author_login>
    <wp:author_email><![CDATA[amy@example.com]]></wp:author_email>
    <wp:author_display_name><![CDATA[Amy]]></wp:author_display_name>
  </wp:author>
  <item>
    <title>Studio Update</title>
    <link>https://amy.squarespace.com/blog/studio-update</link>
    <dc:creator><![CDATA[amy]]></dc:creator>
    <content:encoded><![CDATA[<div class="sqs-block html-block"><div class="sqs-block-content"><p>Welcome to the studio.</p></div></div><div class="sqs-block sqs-block-image"><div class="sqs-block-content"><figure><img data-src="https://images.squarespace-cdn.com/content/v1/photo.jpg?format=1000w" src="data:image/gif;base64,PLACEHOLDER" alt="Studio"/></figure></div></div>]]></content:encoded>
    <wp:post_id>21</wp:post_id>
    <wp:post_name><![CDATA[studio-update]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[post]]></wp:post_type>
    <category domain="post_tag" nicename="studio"><![CDATA[Studio]]></category>
  </item>
</channel>
</rss>`;

const OFF = { importComments: false, importCustomPostTypes: false };

describe("commitSquarespaceImport", () => {
  it("imports a SQSP post, unwrapping wrappers and resolving the real data-src CDN image", async () => {
    const { commitSquarespaceImport } = await import("./review-actions");
    const result = await commitSquarespaceImport(SQSP_WXR, OFF);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const post = await testDb.query.pages.findFirst({ where: (p, { eq }) => eq(p.route, "/studio-update") });
    expect(post!.kind).toBe("post");
    expect(post!.status).toBe("published");
    expect(post!.tags).toEqual(["Studio"]);

    const blocks = (
      await testDb.query.blockSets.findFirst({
        where: (b, { and, eq }) => and(eq(b.ownerType, "page"), eq(b.ownerId, post!.id), eq(b.variant, "published")),
      })
    )!.blocks as Array<{ type: string; content: Record<string, unknown> }>;

    // The intro paragraph became richtext; the SQSP image wrapper unwrapped to a
    // native image block carrying the REAL data-src CDN url (with ?format=),
    // NOT the data: placeholder.
    expect(blocks.map((b) => b.type)).toEqual(["richtext", "image"]);
    expect(blocks[1]!.content).toEqual({
      src: "https://images.squarespace-cdn.com/content/v1/photo.jpg?format=1000w",
      alt: "Studio",
      caption: "",
    });

    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.source).toBe("squarespace");
    expect(receipt!.tableCounts).toMatchObject({ posts: 1, authors: 1 });
  });

  it("creates a redirect from the original Squarespace permalink path", async () => {
    const { commitSquarespaceImport } = await import("./review-actions");
    await commitSquarespaceImport(SQSP_WXR, OFF);
    const redirectRows = await testDb.query.redirects.findMany();
    expect(redirectRows.map((r) => r.fromPath)).toEqual(["/blog/studio-update"]);
    expect(redirectRows[0]!.toPath).toBe("/studio-update");
  });
});
