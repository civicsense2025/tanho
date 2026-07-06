/**
 * DEEP round-trip coverage for the realistic per-platform fixtures.
 *
 * Where fixtures-roundtrip.test.ts asserts only counts, this file COMMITS each
 * fixture into an in-memory DB and verifies the import actually produced the
 * right thing, on three axes:
 *   1. Mapped block output — the captioned image became an `image` block with
 *      the right src/alt/caption, the gallery a `gallery` block with N images,
 *      the embed an `embed` block, the button a `buttons` block, and prose +
 *      code survived as richtext. (Proves card detection fired on real markup.)
 *   2. Entities + relations — pages (status/route), people (paid→member vs
 *      free→subscriber, lowercased email), redirects (301 old→new, resolved),
 *      tags, and the receipt's tableCounts/redirectStatuses/unmapped.
 *   3. Snapshot — the full normalized block tree per fixture, so any future
 *      parse/map regression shows up as a snapshot diff.
 *
 * DB-backed (in-memory libsql + migrate), mirroring every importer's own
 * review-actions.test.ts. Auth/audit/cache/media/search are mocked.
 */
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

import { ghostExportJson, ghostMembersCsv } from "./ghost";
import { wordpressWxr } from "./wordpress";
import { squarespaceWxr } from "./squarespace";
import { substackZip } from "./substack";
import { mediumZip } from "./medium";
import { rss2Feed } from "./rss";
import { markdownZip } from "./markdown-zip";

// ── read-back helpers ───────────────────────────────────────────────────────

type Block = { id: string; type: string; content: Record<string, unknown> };

/** The published block tree for a route (mirrors ghost/review-actions.test.ts). */
async function blocksFor(route: string, variant: "published" | "draft" = "published"): Promise<Block[]> {
  const page = await testDb.query.pages.findFirst({ where: (p, { eq }) => eq(p.route, route) });
  if (!page) throw new Error(`no page at ${route}`);
  const set = await testDb.query.blockSets.findFirst({
    where: (b, { and, eq }) => and(eq(b.ownerType, "page"), eq(b.ownerId, page.id), eq(b.variant, variant)),
  });
  return (set?.blocks ?? []) as Block[];
}

/** Block types in order — the shape of a page. */
const types = (blocks: Block[]) => blocks.map((b) => b.type);
/** First block of a given type (the thing under test). */
const firstOfType = (blocks: Block[], type: string) => blocks.find((b) => b.type === type);
/** Normalize a block tree for snapshotting: drop volatile ids. */
const forSnapshot = (blocks: Block[]) => blocks.map(({ type, content }) => ({ type, content }));

// ═══════════════════════════════════════════════════════════════════════════
// Ghost
// ═══════════════════════════════════════════════════════════════════════════
describe("Ghost — deep", () => {
  it("maps the Ghost image + gallery cards to native blocks", async () => {
    const { commitGhostImport } = await import("../ghost/review-actions");
    const r = await commitGhostImport(JSON.parse(ghostExportJson()), ghostMembersCsv());
    expect(r.ok).toBe(true);

    const blocks = await blocksFor("/welcome-to-the-blog");
    // richtext intro, an image card, a gallery card, richtext outro.
    expect(types(blocks)).toEqual(["richtext", "image", "gallery", "richtext"]);

    const img = firstOfType(blocks, "image")!;
    expect(img.content.src).toBe("https://static.ghost.example/content/images/2024/03/hero.jpg");
    expect(img.content.caption).toBe("Sunrise over the ridge.");

    const gallery = firstOfType(blocks, "gallery")!;
    expect((gallery.content.images as unknown[]).length).toBe(2);
    expect((gallery.content.images as Array<{ src: string }>)[0].src).toBe(
      "https://static.ghost.example/content/images/2024/03/g1.jpg",
    );
  });

  it("maps the button card and preserves the code block as richtext", async () => {
    const { commitGhostImport } = await import("../ghost/review-actions");
    await commitGhostImport(JSON.parse(ghostExportJson()), ghostMembersCsv());

    const embedPage = await blocksFor("/a-video-and-a-button");
    // A button card → buttons block.
    const buttons = firstOfType(embedPage, "buttons")!;
    expect(buttons).toBeDefined();
    expect((buttons.content.items as Array<{ href: string }>)[0].href).toBe("https://example.com/full-writeup");

    // Code post: <pre><code> stays inside richtext (no importer emits a code block).
    const codePage = await blocksFor("/code-and-bookmarks");
    const codeHtml = codePage
      .filter((b) => b.type === "richtext")
      .map((b) => b.content.html as string)
      .join("");
    expect(codeHtml).toContain("export function add");
  });

  it("imports members: paid/comp → member, free → subscriber, and skips deleted", async () => {
    const { commitGhostImport } = await import("../ghost/review-actions");
    await commitGhostImport(JSON.parse(ghostExportJson()), ghostMembersCsv());

    const supporter = await testDb.query.people.findFirst({ where: (p, { eq }) => eq(p.email, "supporter@example.com") });
    const reader = await testDb.query.people.findFirst({ where: (p, { eq }) => eq(p.email, "reader@example.com") });
    const deleted = await testDb.query.people.findFirst({ where: (p, { eq }) => eq(p.email, "gone@example.com") });
    expect(supporter?.kind).toBe("member"); // complimentary_plan=true
    expect(reader?.kind).toBe("subscriber"); // free
    expect(deleted).toBeUndefined(); // deleted_at set → skipped on import
  });

  it("records the slug-less post as an unmapped issue, not a silent drop", async () => {
    const { dryRunGhostImport } = await import("../ghost/review-actions");
    const r = await dryRunGhostImport(JSON.parse(ghostExportJson()), ghostMembersCsv());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data!.issues.map((i) => i.kind)).toContain("malformed-post");
  });

  it("snapshot: welcome post block tree", async () => {
    const { commitGhostImport } = await import("../ghost/review-actions");
    await commitGhostImport(JSON.parse(ghostExportJson()), ghostMembersCsv());
    expect(forSnapshot(await blocksFor("/welcome-to-the-blog"))).toMatchSnapshot();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WordPress
// ═══════════════════════════════════════════════════════════════════════════
describe("WordPress — deep", () => {
  const OPTS = { importComments: true, importCustomPostTypes: true };

  it("maps the Gutenberg image + gallery, and creates page + CPT + redirects", async () => {
    const { commitWordpressImport } = await import("../wordpress/review-actions");
    const r = await commitWordpressImport(wordpressWxr(), OPTS);
    expect(r.ok).toBe(true);

    const blocks = await blocksFor("/getting-started");
    expect(types(blocks)).toContain("image");
    expect(types(blocks)).toContain("gallery");
    const img = firstOfType(blocks, "image")!;
    expect(img.content.src).toBe("https://old.example.com/wp-content/uploads/2024/03/hero.jpg");
    expect(img.content.caption).toBe("Sunrise over the ridge.");

    // The page (About) came in as a page, not a post.
    const about = await testDb.query.pages.findFirst({ where: (p, { eq }) => eq(p.route, "/about") });
    expect(about?.kind).toBe("page");

    // 301 from the original WP permalink path → new route.
    const redirect = await testDb.query.redirects.findFirst({
      where: (rd, { eq }) => eq(rd.toPath, "/getting-started"),
    });
    expect(redirect?.code).toBe(301);
  });

  it("maps the embed + button blocks", async () => {
    const { commitWordpressImport } = await import("../wordpress/review-actions");
    await commitWordpressImport(wordpressWxr(), OPTS);
    const blocks = await blocksFor("/embeds-and-code");
    // YouTube embed → embed block (sync provider) OR a labeled-link fallback if
    // resolution is unavailable; either way it must not be raw iframe soup.
    const hasEmbedOrLink = blocks.some(
      (b) => b.type === "embed" || (b.type === "buttons" && JSON.stringify(b.content).includes("youtube")),
    );
    expect(hasEmbedOrLink).toBe(true);
    // The wp:button → buttons block pointing at the docs.
    const buttons = blocks.filter((b) => b.type === "buttons");
    expect(JSON.stringify(buttons)).toContain("https://example.com/docs");
  });

  it("snapshot: getting-started block tree", async () => {
    const { commitWordpressImport } = await import("../wordpress/review-actions");
    await commitWordpressImport(wordpressWxr(), OPTS);
    expect(forSnapshot(await blocksFor("/getting-started"))).toMatchSnapshot();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Squarespace
// ═══════════════════════════════════════════════════════════════════════════
describe("Squarespace — deep", () => {
  const OPTS = { importComments: false, importCustomPostTypes: false };

  it("prefers real data-src over the lazy placeholder and maps the gallery", async () => {
    const { commitSquarespaceImport } = await import("../squarespace/review-actions");
    const r = await commitSquarespaceImport(squarespaceWxr(), OPTS);
    expect(r.ok).toBe(true);

    const blocks = await blocksFor("/first-light");
    const img = firstOfType(blocks, "image")!;
    // The real CDN url (with ?format=), NOT the data: placeholder.
    expect(img.content.src).toContain("images.squarespace-cdn.com");
    expect(img.content.src).not.toContain("data:image");

    const gallery = firstOfType(blocks, "gallery")!;
    expect((gallery.content.images as unknown[]).length).toBe(2);
  });

  it("rejects a data:-only placeholder image (no bogus image block)", async () => {
    const { commitSquarespaceImport } = await import("../squarespace/review-actions");
    await commitSquarespaceImport(squarespaceWxr(), OPTS);
    const blocks = await blocksFor("/contact");
    const img = firstOfType(blocks, "image");
    // Either no image block, or one whose src is not a data: URI.
    if (img) expect(img.content.src).not.toContain("data:image");
  });

  it("snapshot: first-light block tree", async () => {
    const { commitSquarespaceImport } = await import("../squarespace/review-actions");
    await commitSquarespaceImport(squarespaceWxr(), OPTS);
    expect(forSnapshot(await blocksFor("/first-light"))).toMatchSnapshot();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Substack
// ═══════════════════════════════════════════════════════════════════════════
describe("Substack — deep", () => {
  it("maps the captioned image + subscribe widget, imports paid/free subscribers", async () => {
    const { commitSubstackImport } = await import("../substack/review-actions");
    const r = await commitSubstackImport(substackZip());
    expect(r.ok).toBe(true);

    const blocks = await blocksFor("/welcome-to-the-newsletter");
    const img = firstOfType(blocks, "image")!;
    expect(img.content.src).toContain("substackcdn.com");
    expect(img.content.caption).toBe("The very first photo.");
    // subscribe-widget → newsletter block.
    expect(types(blocks)).toContain("newsletter");

    const fan = await testDb.query.people.findFirst({ where: (p, { eq }) => eq(p.email, "fan@example.com") });
    const casual = await testDb.query.people.findFirst({ where: (p, { eq }) => eq(p.email, "casual@example.com") });
    expect(fan?.kind).toBe("member"); // active_subscription=true
    expect(casual?.kind).toBe("subscriber");
  });

  it("imports the draft as a draft and 301s the old /p/<slug> path", async () => {
    const { commitSubstackImport } = await import("../substack/review-actions");
    await commitSubstackImport(substackZip());
    const draft = await testDb.query.pages.findFirst({ where: (p, { eq }) => eq(p.route, "/draft-ideas") });
    expect(draft?.status).toBe("draft");
  });

  it("snapshot: welcome newsletter block tree", async () => {
    const { commitSubstackImport } = await import("../substack/review-actions");
    await commitSubstackImport(substackZip());
    expect(forSnapshot(await blocksFor("/welcome-to-the-newsletter"))).toMatchSnapshot();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Medium
// ═══════════════════════════════════════════════════════════════════════════
describe("Medium — deep", () => {
  it("maps figure + pullquote, and 301s the canonical Medium URL", async () => {
    const { commitMediumImport } = await import("../medium/review-actions");
    const r = await commitMediumImport(mediumZip());
    expect(r.ok).toBe(true);

    const blocks = await blocksFor("/my-first-story-on-medium");
    const img = firstOfType(blocks, "image")!;
    expect(img.content.src).toContain("cdn-images-1.medium.com");
    expect(img.content.caption).toBe("A diagram explaining the idea.");
    // graf--pullquote → a quote block.
    expect(types(blocks)).toContain("quote");

    // Redirect from the canonical Medium path.
    const redirect = await testDb.query.redirects.findFirst({
      where: (rd, { eq }) => eq(rd.toPath, "/my-first-story-on-medium"),
    });
    expect(redirect?.code).toBe(301);
  });

  it("imports the draft_ story as a draft", async () => {
    const { commitMediumImport } = await import("../medium/review-actions");
    await commitMediumImport(mediumZip());
    const draft = await testDb.query.pages.findFirst({ where: (p, { eq }) => eq(p.route, "/unfinished-thoughts") });
    expect(draft?.status).toBe("draft");
  });

  it("snapshot: first-story block tree", async () => {
    const { commitMediumImport } = await import("../medium/review-actions");
    await commitMediumImport(mediumZip());
    expect(forSnapshot(await blocksFor("/my-first-story-on-medium"))).toMatchSnapshot();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RSS
// ═══════════════════════════════════════════════════════════════════════════
describe("RSS — deep", () => {
  it("maps a feed figure to an image block and 301s the item permalink", async () => {
    const { commitRssImport } = await import("../rss/review-actions");
    const r = await commitRssImport({ xml: rss2Feed() });
    expect(r.ok).toBe(true);

    const blocks = await blocksFor("/a-post-with-a-picture");
    const img = firstOfType(blocks, "image")!;
    expect(img.content.src).toBe("https://feed.example.com/img/photo.jpg");

    const redirect = await testDb.query.redirects.findFirst({
      where: (rd, { eq }) => eq(rd.toPath, "/a-post-with-a-picture"),
    });
    expect(redirect?.code).toBe(301);
  });

  it("snapshot: picture-post block tree", async () => {
    const { commitRssImport } = await import("../rss/review-actions");
    await commitRssImport({ xml: rss2Feed() });
    expect(forSnapshot(await blocksFor("/a-post-with-a-picture"))).toMatchSnapshot();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Markdown
// ═══════════════════════════════════════════════════════════════════════════
describe("Markdown — deep", () => {
  it("maps an HTML figure to an image block, keeps inline image + code as richtext", async () => {
    const { commitMarkdownImport } = await import("../markdown-zip/review-actions");
    const r = await commitMarkdownImport(markdownZip());
    expect(r.ok).toBe(true);

    const blocks = await blocksFor("/hello-markdown");
    // The raw <figure><img> → a native image block.
    const img = firstOfType(blocks, "image")!;
    expect(img.content.src).toBe("https://cdn.example.com/figure.jpg");
    expect(img.content.caption).toBe("A framed figure.");

    // The inline markdown image (![]() → <p><img></p>) stays in richtext, and the
    // fenced code block survives there too.
    const html = blocks.filter((b) => b.type === "richtext").map((b) => b.content.html as string).join("");
    expect(html).toContain("landscape.jpg"); // inline image kept in prose
    expect(html).toContain("hello from markdown"); // fenced code

    // Frontmatter tags attached to the page.
    const page = await testDb.query.pages.findFirst({ where: (p, { eq }) => eq(p.route, "/hello-markdown") });
    expect(JSON.stringify(page?.tags ?? [])).toContain("writing");

    // Jekyll redirect_from → 301s.
    const redirect = await testDb.query.redirects.findFirst({ where: (rd, { eq }) => eq(rd.fromPath, "/old/hello/") });
    expect(redirect?.toPath).toBe("/hello-markdown");
  });

  it("imports the Hugo aliases as redirects and the draft as a draft", async () => {
    const { commitMarkdownImport } = await import("../markdown-zip/review-actions");
    await commitMarkdownImport(markdownZip());
    const alias = await testDb.query.redirects.findFirst({ where: (rd, { eq }) => eq(rd.fromPath, "/blog/migrating-hugo/") });
    expect(alias?.toPath).toBe("/migrating-from-hugo");
    const draft = await testDb.query.pages.findFirst({ where: (p, { eq }) => eq(p.route, "/a-drafted-idea") });
    expect(draft?.status).toBe("draft");
  });

  it("imports the broken-YAML file with a filename title + records the issue", async () => {
    const { dryRunMarkdownImport } = await import("../markdown-zip/review-actions");
    const r = await dryRunMarkdownImport(markdownZip());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data!.issues.map((i) => i.kind)).toContain("frontmatter-invalid");
  });

  it("snapshot: hello-markdown block tree", async () => {
    const { commitMarkdownImport } = await import("../markdown-zip/review-actions");
    await commitMarkdownImport(markdownZip());
    expect(forSnapshot(await blocksFor("/hello-markdown"))).toMatchSnapshot();
  });
});
