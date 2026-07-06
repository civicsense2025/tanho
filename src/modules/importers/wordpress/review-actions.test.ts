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
// next/cache: updateTag/cacheLife/cacheTag only work inside a real Next request.
// Stubbing them lets the REAL custom-types query (getEnabledCustomTypes, a
// "use cache" fn) run as a plain DB read against the in-memory db every call —
// so the "save type then create entries in one request" path is exercised for
// real, with no stale-cache possible under Vitest.
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return { ...actual, updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() };
});
vi.mock("@/modules/media/usage", () => ({ rebuildMediaUsage: vi.fn(async () => undefined) }));
// Both page and entry publish paths index into the real FTS table via their own
// client; mock all four exports (page + entry) so the commit path no-ops them.
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

/** A realistic WXR export: one author, one post (image card + category + tag +
 *  comment), one page, one `book` CPT item (isbn + WP-internal _edit_lock), and
 *  one attachment. */
const WXR = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:wp="http://wordpress.org/export/1.2/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <wp:author>
    <wp:author_login><![CDATA[jane]]></wp:author_login>
    <wp:author_email><![CDATA[jane@example.com]]></wp:author_email>
    <wp:author_display_name><![CDATA[Jane Doe]]></wp:author_display_name>
  </wp:author>
  <item>
    <title>Hello World</title>
    <link>https://old.example.com/2024/03/hello-world/</link>
    <dc:creator><![CDATA[jane]]></dc:creator>
    <content:encoded><![CDATA[<p>Intro</p><figure class="wp-block-image"><img src="https://cdn.example.com/x.jpg" alt="X"/><figcaption>Cap</figcaption></figure><p>Outro</p>]]></content:encoded>
    <wp:post_id>7</wp:post_id>
    <wp:post_name><![CDATA[hello-world]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[post]]></wp:post_type>
    <category domain="category" nicename="news"><![CDATA[News]]></category>
    <category domain="post_tag" nicename="react"><![CDATA[React]]></category>
    <wp:comment>
      <wp:comment_id>11</wp:comment_id>
      <wp:comment_author><![CDATA[Bob]]></wp:comment_author>
      <wp:comment_author_email><![CDATA[bob@x.com]]></wp:comment_author_email>
      <wp:comment_content><![CDATA[Nice post!]]></wp:comment_content>
      <wp:comment_approved><![CDATA[1]]></wp:comment_approved>
      <wp:comment_date_gmt><![CDATA[2024-03-01 12:00:00]]></wp:comment_date_gmt>
      <wp:comment_parent>0</wp:comment_parent>
    </wp:comment>
  </item>
  <item>
    <title>About</title>
    <link>https://old.example.com/about/</link>
    <content:encoded><![CDATA[<p>About us</p>]]></content:encoded>
    <wp:post_id>8</wp:post_id>
    <wp:post_name><![CDATA[about]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[page]]></wp:post_type>
  </item>
  <item>
    <title>Dune</title>
    <link>https://old.example.com/books/dune/</link>
    <content:encoded><![CDATA[<p>A book body</p>]]></content:encoded>
    <wp:post_id>9</wp:post_id>
    <wp:post_name><![CDATA[dune]]></wp:post_name>
    <wp:status><![CDATA[publish]]></wp:status>
    <wp:post_type><![CDATA[book]]></wp:post_type>
    <wp:postmeta><wp:meta_key><![CDATA[isbn]]></wp:meta_key><wp:meta_value><![CDATA[978-0]]></wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key><![CDATA[_edit_lock]]></wp:meta_key><wp:meta_value><![CDATA[123:1]]></wp:meta_value></wp:postmeta>
  </item>
  <item>
    <title>x.jpg</title>
    <wp:post_id>10</wp:post_id>
    <wp:post_name><![CDATA[x-jpg]]></wp:post_name>
    <wp:status><![CDATA[inherit]]></wp:status>
    <wp:post_type><![CDATA[attachment]]></wp:post_type>
    <wp:attachment_url><![CDATA[https://cdn.example.com/x.jpg]]></wp:attachment_url>
  </item>
</channel>
</rss>`;

const ALL_ON = { importComments: true, importCustomPostTypes: true };

describe("dryRunWordpressImport", () => {
  it("reports counts without writing anything to the database", async () => {
    const { dryRunWordpressImport } = await import("./review-actions");
    const result = await dryRunWordpressImport(WXR, ALL_ON);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data!.postCount).toBe(1);
    expect(result.data!.pageCount).toBe(1);
    expect(result.data!.authorCount).toBe(1);
    expect(result.data!.commentCount).toBe(1);
    expect(result.data!.attachmentCount).toBe(1);
    expect(result.data!.detectedCpts).toEqual([
      { type: "book", slug: "book", count: 1, fields: ["original_url", "isbn"] },
    ]);

    const pages = await testDb.query.pages.findMany();
    expect(pages).toHaveLength(0); // dry run wrote nothing
    const customTypes = await testDb.query.customTypes.findMany();
    expect(customTypes).toHaveLength(0);
  });

  it("surfaces a parse error without throwing", async () => {
    const { dryRunWordpressImport } = await import("./review-actions");
    const result = await dryRunWordpressImport("<notrss></notrss>", ALL_ON);
    expect(result.ok).toBe(false);
  });
});

describe("commitWordpressImport", () => {
  it("creates pages, tags, redirects, a person, custom types, comment + CPT entries, and a receipt", async () => {
    const { commitWordpressImport } = await import("./review-actions");
    const result = await commitWordpressImport(WXR, ALL_ON);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Pages: the post and the page, with correct kinds/routes/tags.
    const pages = await testDb.query.pages.findMany();
    expect(pages.map((p) => p.route).sort()).toEqual(["/about", "/hello-world"]);
    const post = pages.find((p) => p.route === "/hello-world")!;
    expect(post.kind).toBe("post");
    expect(post.status).toBe("published");
    expect(post.tags.sort()).toEqual(["News", "React"]);
    const page = pages.find((p) => p.route === "/about")!;
    expect(page.kind).toBe("page");

    // The post's published block tree = [richtext, image, richtext] with the
    // real remote image src preserved.
    const postBlocks = await testDb.query.blockSets.findFirst({
      where: (b, { and, eq }) => and(eq(b.ownerType, "page"), eq(b.ownerId, post.id), eq(b.variant, "published")),
    });
    const blocks = postBlocks!.blocks as Array<{ type: string; content: Record<string, unknown> }>;
    expect(blocks.map((b) => b.type)).toEqual(["richtext", "image", "richtext"]);
    expect(blocks[1]!.content).toEqual({ src: "https://cdn.example.com/x.jpg", alt: "X", caption: "Cap" });

    // Redirects: from the REAL <link> pathnames, not reconstructed.
    const redirectRows = await testDb.query.redirects.findMany();
    expect(redirectRows.map((r) => r.fromPath).sort()).toEqual(["/2024/03/hello-world/", "/about/"]);

    // Author → one subscriber person (comment author Bob is NOT a person).
    const persons = await testDb.query.people.findMany();
    expect(persons).toHaveLength(1);
    expect(persons[0]!.email).toBe("jane@example.com");
    expect(persons[0]!.kind).toBe("subscriber");

    // Custom types: comment + book (book has isbn, NOT _edit_lock).
    const customTypes = await testDb.query.customTypes.findMany();
    expect(customTypes.map((t) => t.slug).sort()).toEqual(["book", "comment"]);
    const book = customTypes.find((t) => t.slug === "book")!;
    const bookKeys = book.fields.map((f) => f.key);
    expect(bookKeys).toContain("isbn");
    expect(bookKeys).toContain("original_url");
    expect(bookKeys).not.toContain("_edit_lock");

    // Entries: one comment entry + one book entry.
    const commentEntries = await testDb.query.entries.findMany({ where: (e, { eq }) => eq(e.type, "custom:comment") });
    expect(commentEntries).toHaveLength(1);
    expect(commentEntries[0]!.data).toMatchObject({ author_name: "Bob", approved: true, source_post: "hello-world" });

    const bookEntries = await testDb.query.entries.findMany({ where: (e, { eq }) => eq(e.type, "custom:book") });
    expect(bookEntries).toHaveLength(1);
    expect(bookEntries[0]!.slug).toBe("dune");
    expect(bookEntries[0]!.data).toMatchObject({ isbn: "978-0", original_url: "https://old.example.com/books/dune/" });

    // The book entry has a published block tree under entry:custom:book.
    const bookBlocks = await testDb.query.blockSets.findFirst({
      where: (b, { and, eq }) => and(eq(b.ownerType, "entry:custom:book"), eq(b.ownerId, bookEntries[0]!.id), eq(b.variant, "published")),
    });
    expect(bookBlocks).toBeTruthy();
    expect((bookBlocks!.blocks as Array<{ type: string }>).some((b) => b.type === "richtext")).toBe(true);

    // Receipt.
    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.source).toBe("wordpress");
    expect(receipt!.tableCounts).toEqual({ posts: 1, pages: 1, authors: 1, comments: 1, custom_entries: 1 });
    expect(receipt!.unmapped.some((u) => u.kind === "attachments-skipped")).toBe(true);
  });

  it("is idempotent on a re-run: no duplicates, collisions reported", async () => {
    const { commitWordpressImport } = await import("./review-actions");
    await commitWordpressImport(WXR, ALL_ON);
    const second = await commitWordpressImport(WXR, ALL_ON);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(await testDb.query.pages.findMany()).toHaveLength(2);
    expect(await testDb.query.people.findMany()).toHaveLength(1);
    expect(await testDb.query.entries.findMany()).toHaveLength(2);
    expect(await testDb.query.customTypes.findMany()).toHaveLength(2);

    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, second.data!.receiptId) });
    expect(receipt!.unmapped.some((u) => u.kind === "post-route-collision")).toBe(true);
    expect(receipt!.unmapped.some((u) => u.kind === "author-email-collision")).toBe(true);
    expect(receipt!.unmapped.some((u) => u.kind === "comment-skipped")).toBe(true);
  });

  it("with toggles off, creates no custom types or entries", async () => {
    const { commitWordpressImport } = await import("./review-actions");
    const result = await commitWordpressImport(WXR, { importComments: false, importCustomPostTypes: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(await testDb.query.customTypes.findMany()).toHaveLength(0);
    expect(await testDb.query.entries.findMany()).toHaveLength(0);
    // Only the post + page were imported.
    expect(await testDb.query.pages.findMany()).toHaveLength(2);

    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.tableCounts.comments).toBeUndefined();
    expect(receipt!.tableCounts.custom_entries).toBeUndefined();
  });

  it("imports a private-status item as a draft with a status-downgraded issue", async () => {
    const privateWxr = WXR.replace("<![CDATA[publish]]></wp:status>\n    <wp:post_type><![CDATA[page]]>", "<![CDATA[private]]></wp:status>\n    <wp:post_type><![CDATA[page]]>");
    const { commitWordpressImport } = await import("./review-actions");
    const result = await commitWordpressImport(privateWxr, { importComments: false, importCustomPostTypes: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const about = await testDb.query.pages.findFirst({ where: (p, { eq }) => eq(p.route, "/about") });
    expect(about!.status).toBe("draft");
    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.unmapped.some((u) => u.kind === "status-downgraded")).toBe(true);
  });

  it("does not throw when an author email is taken by a pre-existing row", async () => {
    await testDb.insert(people).values({ email: "jane@example.com", name: "Already Here", kind: "subscriber" });
    const { commitWordpressImport } = await import("./review-actions");
    const result = await commitWordpressImport(WXR, ALL_ON);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const jane = await testDb.query.people.findFirst({ where: (p, { eq }) => eq(p.email, "jane@example.com") });
    expect(jane!.name).toBe("Already Here"); // untouched, not overwritten
    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.unmapped.some((u) => u.kind === "author-email-collision")).toBe(true);
  });
});
