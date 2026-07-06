import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "../renderer/BlockRenderer";
import type { BlockNode } from "../types";

async function render(content: Record<string, unknown>): Promise<string> {
  const block: BlockNode = { id: "jt", type: "jump-to-top", content };
  const el = await RenderBlock({ block, device: "desktop", mode: "public", viewer: null });
  return renderToStaticMarkup(el);
}

describe("jump-to-top block", () => {
  it("is a plain #top anchor (works with no JS)", async () => {
    const html = await render({});
    expect(html).toContain('href="#top"');
  });

  it("carries the scroll threshold hook and accessible label", async () => {
    const html = await render({ showAfter: 800, label: "Scroll up" });
    expect(html).toContain('data-jump-top="800"');
    expect(html).toContain('aria-label="Scroll up"');
    expect(html).toContain('title="Scroll up"');
  });
});
