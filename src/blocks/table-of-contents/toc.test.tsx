import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "../renderer/BlockRenderer";
import type { BlockNode, OutlineHeadingCtx } from "../types";

const OUTLINE: OutlineHeadingCtx[] = [
  { id: "intro", text: "Intro", level: 1 },
  { id: "setup", text: "Setup", level: 2 },
  { id: "details", text: "Details", level: 3 },
  { id: "deep", text: "Deep", level: 4 },
];

async function renderToc(
  content: Record<string, unknown>,
  opts: { outline?: OutlineHeadingCtx[]; mode?: "public" | "editor"; withOutline?: boolean } = {},
): Promise<string> {
  const { mode = "public", withOutline = true } = opts;
  const outline = withOutline ? opts.outline ?? OUTLINE : undefined;
  const block: BlockNode = { id: "toc", type: "table-of-contents", content };
  const el = await RenderBlock({ block, device: "desktop", mode, viewer: null, outline });
  return renderToStaticMarkup(el);
}

describe("table-of-contents block", () => {
  it("renders a labelled nav landmark with anchor links (crawlable, no-JS)", async () => {
    const html = await renderToc({});
    expect(html).toContain("<nav");
    expect(html).toContain('aria-label="On this page"');
    // default minLevel h2 / maxLevel h3 → Setup + Details only
    expect(html).toContain('href="#setup"');
    expect(html).toContain('href="#details"');
    expect(html).toContain("Setup");
    expect(html).toContain("Details");
  });

  it("respects minLevel/maxLevel", async () => {
    const html = await renderToc({ minLevel: "h1", maxLevel: "h2" });
    expect(html).toContain('href="#intro"');
    expect(html).toContain('href="#setup"');
    expect(html).not.toContain('href="#details"');
    expect(html).not.toContain('href="#deep"');
  });

  it("tolerates minLevel/maxLevel given in reverse order", async () => {
    const html = await renderToc({ minLevel: "h3", maxLevel: "h1" });
    // lo=1, hi=3 → intro, setup, details (not deep/h4)
    expect(html).toContain('href="#intro"');
    expect(html).toContain('href="#details"');
    expect(html).not.toContain('href="#deep"');
  });

  it("emits data-toc-link hooks for the scroll-spy island", async () => {
    const html = await renderToc({ minLevel: "h1", maxLevel: "h4" });
    expect(html).toContain('data-toc-link="intro"');
    expect(html).toContain('data-toc-link="deep"');
  });

  it("wraps in <details> when collapsible", async () => {
    const html = await renderToc({ collapsible: true });
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
  });

  it("adds the smooth-scroll opt-in marker only when enabled", async () => {
    expect(await renderToc({ smoothScroll: true })).toContain("data-toc-smooth");
    expect(await renderToc({ smoothScroll: false })).not.toContain("data-toc-smooth");
  });

  it("renders no list when no headings match the level range", async () => {
    // Outline has only an h1; default range is h2–h3 → nothing to link. The
    // walker still emits the empty data-block wrapper; the point is no nav/links.
    const html = await renderToc({}, { outline: [{ id: "only", text: "Only", level: 1 }] });
    expect(html).not.toContain("<nav");
    expect(html).not.toContain("<a ");
  });

  it("shows an editor placeholder when the outline is absent (editor mode)", async () => {
    const html = await renderToc({}, { withOutline: false, mode: "editor" });
    expect(html.toLowerCase()).toContain("table of contents");
    expect(html).not.toContain("<nav");
  });

  it("shows the editor placeholder for an EMPTY outline too (heading-less page)", async () => {
    // An empty array (page has no headings yet) must not make the block vanish
    // from the canvas — only the public site renders nothing.
    const html = await renderToc({}, { outline: [], mode: "editor" });
    expect(html.toLowerCase()).toContain("table of contents");
    expect(html).not.toContain("<nav");
  });
});
