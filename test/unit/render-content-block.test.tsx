import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { parseBlocks } from "@/lib/blocks/core/validate";
import { RenderContentBlock } from "@/lib/blocks/core/RenderBlock";

// End-to-end for the public render path: a styled block persisted as JSON goes through the same
// trust-boundary validator the pages use, then through RenderContentBlock (BlockShell + renderer).
// Proves style set in the builder actually reaches the DOM as token-referencing CSS.
beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

function renderFromJSON(block: unknown): string {
  const [validated] = parseBlocks({ blocks: [block] });
  return renderToStaticMarkup(
    <RenderContentBlock block={{ type: validated.type, content: validated.content, style: validated.style, variant: validated.variant }} />
  );
}

describe("RenderContentBlock (validate → render)", () => {
  it("renders an unstyled block with no BlockShell wrapper (zero regression)", () => {
    const html = renderFromJSON({ type: "text", content: { html: "<p>hello</p>" } });
    // No data-block wrapper, no scoped style — exactly the pre-style DOM.
    expect(html).not.toContain("data-block");
    expect(html).not.toContain("<style");
    expect(html).toContain("hello");
  });

  it("applies base style as inline CSS on a single wrapper", () => {
    const html = renderFromJSON({
      type: "text",
      content: { html: "x" },
      style: { align: "center", background: "tint", radius: "md" },
    });
    expect(html).toContain("data-block");
    expect(html).toContain("text-align:center");
    expect(html).toContain("background:var(--accent-tint)");
    expect(html).toContain("border-radius:var(--radius-md)");
  });

  it("emits mobile-first container queries for a responsive block on the public path", () => {
    const html = renderFromJSON({
      type: "text",
      content: { html: "x" },
      style: { padTop: "2", tablet: { padTop: "6" }, desktop: { padTop: "12" } },
    });
    expect(html).toContain("<style");
    expect(html).toContain("@container (min-width:48rem)");
    expect(html).toContain("@container (min-width:64rem)");
    // base padding-top is the mobile value; overrides carry the larger steps.
    expect(html).toContain("padding-top:var(--space-2)");
    expect(html).toContain("padding-top:var(--space-6)");
    expect(html).toContain("padding-top:var(--space-12)");
  });
});
