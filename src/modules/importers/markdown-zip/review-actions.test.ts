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

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

/** A small markdown export: a published post (with frontmatter title/tags/alias)
 *  and a draft file (no title → filename-derived). */
function makeZip(files: Record<string, string>): File {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) entries[path] = strToU8(content);
  return new File([zipSync(entries)], "x.zip", { type: "application/zip" });
}

const ZIP_FILES = {
  "posts/hello.md":
    "---\ntitle: Hello World\nslug: hello-world\ntags: [news, react]\naliases: [/old/hello/]\n---\n# Hi\n\nBody para.",
  "draft.md": "---\ndraft: true\n---\nDraft body",
};

function makeInputZip(): File {
  return makeZip(ZIP_FILES);
}

describe("dryRunMarkdownImport", () => {
  it("reports counts without writing anything to the database", async () => {
    const { dryRunMarkdownImport } = await import("./review-actions");
    const result = await dryRunMarkdownImport(makeInputZip());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data!.pageCount).toBe(2);
    expect(result.data!.publishedCount).toBe(1); // hello published, draft not

    const pages = await testDb.query.pages.findMany();
    expect(pages).toHaveLength(0); // dry run wrote nothing
  });

  it("surfaces a parse error without throwing", async () => {
    const { dryRunMarkdownImport } = await import("./review-actions");
    const result = await dryRunMarkdownImport(makeZip({ "readme.txt": "not markdown" }));
    expect(result.ok).toBe(false);
  });
});

describe("commitMarkdownImport", () => {
  it("creates pages, redirects, and a receipt", async () => {
    const { commitMarkdownImport } = await import("./review-actions");
    const result = await commitMarkdownImport(makeInputZip());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Pages: both files, as pages with correct routes/kind/status/tags.
    const pages = await testDb.query.pages.findMany();
    expect(pages.map((p) => p.route).sort()).toEqual(["/draft", "/hello-world"]);

    const hello = pages.find((p) => p.route === "/hello-world")!;
    expect(hello.kind).toBe("page");
    expect(hello.status).toBe("published");
    expect(hello.tags.sort()).toEqual(["news", "react"]);

    const draft = pages.find((p) => p.route === "/draft")!;
    expect(draft.status).toBe("draft");

    // The published post's block tree contains a richtext block from the body.
    const helloBlocks = await testDb.query.blockSets.findFirst({
      where: (b, { and, eq }) => and(eq(b.ownerType, "page"), eq(b.ownerId, hello.id), eq(b.variant, "published")),
    });
    const blocks = helloBlocks!.blocks as Array<{ type: string }>;
    expect(blocks.some((b) => b.type === "richtext")).toBe(true);

    // Redirect from the frontmatter alias → the new route.
    const redirectRows = await testDb.query.redirects.findMany();
    expect(redirectRows.map((r) => r.fromPath)).toContain("/old/hello/");

    // Receipt.
    const receipt = await testDb.query.importReceipts.findFirst({
      where: (r, { eq }) => eq(r.id, result.data!.receiptId),
    });
    expect(receipt!.source).toBe("markdown-zip");
    expect(receipt!.tableCounts).toMatchObject({ pages: 2 });
  });

  it("is idempotent on a re-run: no duplicates, collisions reported", async () => {
    const { commitMarkdownImport } = await import("./review-actions");
    await commitMarkdownImport(makeInputZip());
    const second = await commitMarkdownImport(makeInputZip());
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
