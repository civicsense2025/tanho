import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "../renderer/BlockRenderer";
import type { BlockNode } from "../types";

async function render(
  content: Record<string, unknown>,
  anchors?: Record<string, string>,
): Promise<string> {
  const block: BlockNode = { id: "s", type: "section", content: { blocks: [], ...content } };
  const el = await RenderBlock({ block, device: "desktop", mode: "public", viewer: null, anchors });
  return renderToStaticMarkup(el);
}

describe("section anchorId", () => {
  it("applies a deep-linkable id + scroll-margin when set", async () => {
    const html = await render({ anchorId: "pricing" });
    expect(html).toContain('id="pricing"');
    expect(html).toContain("scroll-margin-top:var(--header-height, 0px)");
  });

  it("emits no id when anchorId is empty", async () => {
    const html = await render({});
    expect(html).not.toContain(" id=");
  });

  it("re-slugifies defensively (never emits an unsafe id)", async () => {
    // Content-level regex would reject this on save, but the render slugifies
    // again as defence in depth.
    const html = await render({ anchorId: "already-safe" });
    expect(html).toContain('id="already-safe"');
  });

  it("prefers the page-unique deduped id stamped by the walker", async () => {
    // A heading elsewhere already claimed "setup"; the outline assigned this
    // section "setup-2" in the shared namespace.
    const html = await render({ anchorId: "setup" }, { s: "setup-2" });
    expect(html).toContain('id="setup-2"');
    expect(html).not.toContain('id="setup"');
  });
});
