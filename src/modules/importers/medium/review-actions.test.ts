import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { zipSync, strToU8 } from "fflate";
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
// Embed resolution makes a live network call for some providers (SoundCloud
// oEmbed); mock it so the importer's embed path is deterministic and offline.
// A youtube.com/embed URL resolves; anything else is an unsupported provider.
vi.mock("@/modules/embeds/resolve", () => ({
  resolveEmbedUrl: vi.fn(async (url: string) => {
    if (url.includes("youtube.com/embed/")) {
      return { ok: true, provider: "youtube", url };
    }
    return { ok: false, error: "unsupported" };
  }),
}));

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

/** A minimal Medium story export HTML. */
function story(opts: { title: string; body: string; canonical?: string }): string {
  const canonical = opts.canonical ? `<a class="p-canonical" href="${opts.canonical}"></a>` : "";
  return `<!DOCTYPE html><html><head><title>${opts.title}</title>${canonical}</head>
<body><article>
  <header><h1 class="p-name">${opts.title}</h1></header>
  <section data-field="body">${opts.body}</section>
</article></body></html>`;
}

/** Build an in-memory Medium export .zip File. */
function makeZip(files: Record<string, string>): File {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) entries[path] = strToU8(content);
  return new File([zipSync(entries)], "medium.zip", { type: "application/zip" });
}

const ZIP = makeZip({
  "posts/2024-03-10_Hello-Medium-abc123def456.html": story({
    title: "Hello Medium",
    body:
      "<p>Intro paragraph.</p>" +
      '<figure class="graf--figure"><img src="https://cdn.medium.com/pic.jpg" alt="Pic"/><figcaption>A caption</figcaption></figure>' +
      '<blockquote class="graf--pullquote">A memorable line.</blockquote>' +
      "<p>Outro paragraph.</p>",
    canonical: "https://medium.com/@me/hello-medium-abc123def456",
  }),
  "posts/draft_Rough-Notes-000999.html": story({
    title: "Rough Notes",
    body: "<p>Still cooking.</p>",
  }),
});

describe("dryRunMediumImport", () => {
  it("reports counts without writing anything to the database", async () => {
    const { dryRunMediumImport } = await import("./review-actions");
    const result = await dryRunMediumImport(ZIP);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data!.postCount).toBe(2);
    expect(result.data!.publishedCount).toBe(1);

    const pages = await testDb.query.pages.findMany();
    expect(pages).toHaveLength(0); // dry run wrote nothing
  });

  it("surfaces a parse error without throwing", async () => {
    const { dryRunMediumImport } = await import("./review-actions");
    const empty = makeZip({ "readme.txt": "no posts here" });
    const result = await dryRunMediumImport(empty);
    expect(result.ok).toBe(false);
  });
});

describe("commitMediumImport", () => {
  it("creates posts with block trees, redirects, and a receipt", async () => {
    const { commitMediumImport } = await import("./review-actions");
    const result = await commitMediumImport(ZIP);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Pages: the published story and the draft, both as posts.
    const pages = await testDb.query.pages.findMany();
    expect(pages.map((p) => p.route).sort()).toEqual(["/hello-medium", "/rough-notes"]);
    const hello = pages.find((p) => p.route === "/hello-medium")!;
    expect(hello.kind).toBe("post");
    expect(hello.status).toBe("published");
    const draft = pages.find((p) => p.route === "/rough-notes")!;
    expect(draft.status).toBe("draft");

    // The published story's block tree: richtext, image, quote, richtext.
    const helloBlocks = await testDb.query.blockSets.findFirst({
      where: (b, { and, eq }) => and(eq(b.ownerType, "page"), eq(b.ownerId, hello.id), eq(b.variant, "published")),
    });
    const blocks = helloBlocks!.blocks as Array<{ type: string; content: Record<string, unknown> }>;
    expect(blocks.map((b) => b.type)).toEqual(["richtext", "image", "quote", "richtext"]);
    expect(blocks[1]!.content).toMatchObject({ src: "https://cdn.medium.com/pic.jpg", alt: "Pic", caption: "A caption" });
    expect(blocks[2]!.content).toMatchObject({ text: "A memorable line.", cite: "" });

    // Redirect: from the Medium canonical pathname.
    const redirectRows = await testDb.query.redirects.findMany();
    expect(redirectRows.map((r) => r.fromPath)).toContain("/@me/hello-medium-abc123def456");

    // Receipt.
    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, result.data!.receiptId) });
    expect(receipt!.source).toBe("medium");
    expect(receipt!.tableCounts).toMatchObject({ pages: 2 });
  });

  it("is idempotent on a re-run: no duplicate pages, collisions reported", async () => {
    const { commitMediumImport } = await import("./review-actions");
    await commitMediumImport(ZIP);
    const second = await commitMediumImport(ZIP);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(await testDb.query.pages.findMany()).toHaveLength(2);

    const receipt = await testDb.query.importReceipts.findFirst({ where: (r, { eq }) => eq(r.id, second.data!.receiptId) });
    expect(receipt!.unmapped.some((u) => u.kind === "route-collision")).toBe(true);
  });
});
