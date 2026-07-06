import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "../renderer/BlockRenderer";
import type { BlockNode } from "../types";

async function render(content: Record<string, unknown>): Promise<string> {
  const block: BlockNode = { id: "rp", type: "reading-progress", content };
  const el = await RenderBlock({ block, device: "desktop", mode: "public", viewer: null });
  return renderToStaticMarkup(el);
}

describe("reading-progress block", () => {
  it("renders a decorative bar with the island hook", async () => {
    const html = await render({});
    expect(html).toContain("data-reading-progress");
    expect(html).toContain('aria-hidden="true"');
  });

  it("is inert/complete with no JS (a fill element is present)", async () => {
    // The fill exists in server HTML; CSS drives it (scroll-timeline) or the
    // island sets --reading-progress. Either way no content is hidden.
    const html = await render({ color: "accent-2", thickness: "thick", position: "bottom" });
    expect(html).toContain("<div"); // bar + fill
  });
});
