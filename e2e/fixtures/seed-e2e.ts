/**
 * Deterministic e2e fixture content. Seeds published pages exercising the
 * structural blocks + advanced layout, so Playwright can verify real-browser
 * behaviour (scroll-spy, sticky, reading-progress, jump-to-top, responsive
 * layout) that the headless preview tool cannot. Idempotent — safe to re-run.
 *
 * Run standalone with: npx tsx --env-file-if-exists=.env e2e/fixtures/seed-e2e.ts
 * (Playwright's globalSetup runs it before the suite.)
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "../../src/lib/db/client";
import { pages, blockSets } from "../../src/modules/pages/schema";

const heading = (id: string, text: string, level = "h2") => ({
  id,
  type: "heading",
  content: { text, level, align: "left" },
});
const rich = (id: string, md: string) => ({ id, type: "richtext", content: { md } });

/** The structural-blocks showcase page: TOC (sticky) + reading-progress +
 *  jump-to-top + long scrollable sections with headings (incl. a duplicate). */
const STRUCTURAL_BLOCKS = [
  { id: "rp", type: "reading-progress", content: { position: "top", color: "accent", thickness: "medium" } },
  { id: "toc", type: "table-of-contents", content: { title: "Contents", minLevel: "h2", maxLevel: "h3", sticky: true, highlightActive: true, smoothScroll: true } },
  heading("h-overview", "Overview", "h2"),
  rich("t1", "Overview copy. ".repeat(60)),
  heading("h-details", "Details", "h2"),
  heading("h-sub", "Sub detail", "h3"),
  rich("t2", "Detail copy. ".repeat(80)),
  heading("h-usage", "Usage", "h2"),
  rich("t3", "Usage copy. ".repeat(80)),
  heading("h-usage2", "Usage", "h2"), // duplicate text → must dedupe to usage-2
  rich("t4", "More usage copy. ".repeat(80)),
  { id: "jt", type: "jump-to-top", content: { showAfter: 300, label: "Back to top" } },
];

/** Advanced-layout showcase: a row with per-breakpoint columns + gap, exercising
 *  the real @media responsive CSS the layout layer emits. */
const LAYOUT_BLOCKS = [
  heading("lh", "Responsive Layout", "h2"),
  {
    id: "row1",
    type: "row",
    content: {
      cols: 2,
      gap: "md",
      align: "stretch",
      layout: {
        base: { cols: "1", gap: "3" },
        tablet: { cols: "2" },
        desktop: { cols: "3", gap: "6" },
      },
      blocks: [
        { id: "c1", type: "callout", content: { text: "Column one", type: "info" } },
        { id: "c2", type: "callout", content: { text: "Column two", type: "info" } },
        { id: "c3", type: "callout", content: { text: "Column three", type: "info" } },
      ],
    },
  },
  {
    id: "sec-custom",
    type: "section",
    content: {
      width: "contained",
      background: "none",
      py: "md",
      // Target a real rendered element by its stable data-block hook (the
      // targeting guide's pattern). Deliberately INCLUDES the scope class to
      // prove the sanitizer doesn't double-scope when the author copies the
      // guide verbatim.
      customCss: '.pb-custom-scope [data-block="quote"] { outline: 3px solid var(--accent); }',
      blocks: [
        { id: "cc", type: "quote", content: { text: "Custom-CSS-targeted quote", attribution: "" } },
      ],
    },
  },
];

async function upsertPage(
  id: string,
  slug: string,
  route: string,
  title: string,
  parentId: string | null,
  blocks: unknown[],
  hasPaywall = false,
  extra: { kind?: "page" | "post"; seoDescription?: string } = {},
) {
  await db.delete(pages).where(eq(pages.id, id));
  await db.delete(blockSets).where(eq(blockSets.ownerId, id));
  await db.insert(pages).values({
    id,
    slug,
    route,
    title,
    kind: extra.kind ?? "page",
    seoDescription: extra.seoDescription ?? "",
    status: "published",
    template: "blank",
    parentId,
    hasPaywall,
    publishedAt: Date.now(),
  });
  if (blocks.length) {
    await db.insert(blockSets).values({ ownerType: "page", ownerId: id, variant: "published", blocks });
  }
}

export async function seedE2e() {
  // Breadcrumb ancestor chain: /e2e-docs → /e2e-docs/guides → the showcase.
  await upsertPage("e2e-docs", "e2e-docs", "/e2e-docs", "E2E Docs", null, [heading("h", "Docs", "h1")]);
  await upsertPage("e2e-guides", "e2e-guides", "/e2e-docs/guides", "E2E Guides", "e2e-docs", [heading("h", "Guides", "h1")]);
  await upsertPage(
    "e2e-structural",
    "e2e-structural",
    "/e2e-docs/guides/structural",
    "Structural Blocks",
    "e2e-guides",
    [
      { id: "bc", type: "breadcrumbs", content: { showHome: true, separator: "chevron" } },
      ...STRUCTURAL_BLOCKS,
    ],
  );
  await upsertPage("e2e-layout", "e2e-layout", "/e2e-layout", "Layout Showcase", null, LAYOUT_BLOCKS);

  // A kind:"post" page → must emit page-level schema.org Article JSON-LD
  // (activates the dormant article() builder in the page route).
  await upsertPage(
    "e2e-post",
    "e2e-post",
    "/e2e-post",
    "E2E Post Title",
    null,
    [heading("h", "Post Body", "h1"), rich("t", "Post copy. ".repeat(20))],
    /* hasPaywall */ false,
    { kind: "post", seoDescription: "A concise post summary for structured data." },
  );

  // Paywall page: TOC + free heading + paywall + gated heading (anonymous view
  // must not leak the gated heading in the TOC).
  await upsertPage(
    "e2e-paywall",
    "e2e-paywall",
    "/e2e-paywall",
    "Paywall TOC",
    null,
    [
      { id: "toc", type: "table-of-contents", content: { title: "Contents", minLevel: "h2", maxLevel: "h3" } },
      heading("h-free", "Free Section", "h2"),
      rich("t1", "Free copy. ".repeat(20)),
      { id: "pw", type: "paywall", content: { tier: "" } },
      heading("h-gated", "Secret Members Strategy", "h2"),
      rich("t2", "Gated copy. ".repeat(20)),
    ],
    /* hasPaywall */ true,
  );
}

/** Remove all e2e fixture pages (for teardown / clean re-seed). */
export async function cleanE2e() {
  const ids = ["e2e-docs", "e2e-guides", "e2e-structural", "e2e-layout", "e2e-paywall", "e2e-post"];
  await db.delete(blockSets).where(inArray(blockSets.ownerId, ids));
  await db.delete(pages).where(inArray(pages.id, ids));
}

// Allow running directly (outside Playwright) for manual checks.
if (process.argv[1] && process.argv[1].endsWith("seed-e2e.ts")) {
  seedE2e().then(
    () => {
      console.log("e2e fixture pages seeded.");
      process.exit(0);
    },
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
