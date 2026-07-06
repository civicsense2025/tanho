import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "../renderer/BlockRenderer";
import type { BlockNode } from "../types";

const heading = (id: string, text: string, level = "h2"): BlockNode => ({
  id,
  type: "heading",
  content: { text, level, align: "left" },
});

async function render(block: BlockNode, anchors?: Record<string, string>): Promise<string> {
  const el = await RenderBlock({ block, device: "desktop", mode: "public", viewer: null, anchors });
  return renderToStaticMarkup(el);
}

describe("heading anchors", () => {
  it("emits a slug id from the text when no anchor map is threaded", async () => {
    const html = await render(heading("h", "Getting Started"));
    expect(html).toContain('id="getting-started"');
  });

  it("prefers the page-unique deduped id from ctx.anchors", async () => {
    // Two headings would both slugify to "overview"; the walker injects the
    // deduped id for the second so anchors stay unique.
    const html = await render(heading("b", "Overview"), { b: "overview-2" });
    expect(html).toContain('id="overview-2"');
    expect(html).not.toContain('id="overview"');
  });

  it("sets scroll-margin-top so anchor landings clear a sticky header", async () => {
    const html = await render(heading("h", "Anything"));
    expect(html).toContain("scroll-margin-top:var(--header-height, 0px)");
  });
});
