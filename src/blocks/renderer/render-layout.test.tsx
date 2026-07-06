import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "./BlockRenderer";
import { CUSTOM_SCOPE_CLASS } from "@/lib/css-sanitizer";
import type { BlockNode, Device } from "../types";

/**
 * End-to-end PUBLIC render path for the advanced-layout layer + custom-CSS escape
 * hatch on layout blocks. The served page uses ONE device branch, so per-breakpoint
 * layout must arrive as a scoped <style> with real @media overrides (not a
 * ctx.device branch) — asserted here. customCss must be re-sanitised at render.
 */
async function renderAt(block: BlockNode, device: Device = "desktop"): Promise<string> {
  const el = await RenderBlock({ block, device, mode: "public", viewer: null });
  return renderToStaticMarkup(el);
}

describe("layout layer — scoped <style> with real @media responsiveness", () => {
  const block: BlockNode = {
    id: "abc123",
    type: "row",
    content: {
      cols: 2,
      gap: "md",
      align: "stretch",
      blocks: [],
      layout: {
        base: { direction: "column", gap: "4" },
        tablet: { cols: "2", justify: "center" },
        desktop: { cols: "3", gap: "8" },
      },
    },
  };

  it("puts a generated per-block class on the wrapper", async () => {
    const html = await renderAt(block);
    expect(html).toContain('data-block="row"');
    expect(html).toContain('class="pb-abc123"');
  });

  it("emits base declarations that consume the --pbl-* custom properties", async () => {
    const html = await renderAt(block);
    expect(html).toContain(".pb-abc123{");
    expect(html).toMatch(/--pbl-direction:column/);
    expect(html).toMatch(/--pbl-gap:var\(--space-4\)/);
    // Grid because a breakpoint sets cols.
    expect(html).toMatch(/display:grid/);
    expect(html).toMatch(/grid-template-columns:var\(--pbl-cols, 1fr\)/);
  });

  it("emits @media overrides for tablet (768) and desktop (1024)", async () => {
    const html = await renderAt(block);
    expect(html).toMatch(/@media \(min-width:768px\)\{\.pb-abc123\{[^}]*--pbl-cols:repeat\(2, minmax\(0, 1fr\)\)/);
    expect(html).toMatch(/@media \(min-width:1024px\)\{\.pb-abc123\{[^}]*--pbl-cols:repeat\(3, minmax\(0, 1fr\)\)/);
    expect(html).toMatch(/--pbl-justify:center/);
  });

  it("is token-only — no raw px/hex leaks into the emitted CSS", async () => {
    const html = await renderAt(block);
    // The per-block scoped <style> (shared with the style/hideOn layers — same
    // selector, so they're emitted as one tag). Grab everything up to the block's
    // inner render.
    const styleMatch = html.match(/<style data-block-style="">([\s\S]*?)<\/style>/);
    expect(styleMatch).toBeTruthy();
    const css = styleMatch![1];
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    // px only appears inside the @media (min-width:NNNpx) conditions, never as a value.
    expect(css.replace(/min-width:\d+px/g, "")).not.toMatch(/\d+px/);
  });

  it("a layout block with NO layout controls emits no scoped <style> or class", async () => {
    const plain: BlockNode = { id: "z", type: "row", content: { cols: 2, gap: "md", align: "stretch", blocks: [] } };
    const html = await renderAt(plain);
    expect(html).not.toContain("data-block-style");
    expect(html).not.toContain('class="pb-z"');
  });

  it("sanitises a hostile block id before it reaches the class/selector", async () => {
    // A block id is used to build the wrapper class + the scoped selector. Even a
    // maliciously-crafted id must not break out of the class attribute or <style>.
    const hostile: BlockNode = {
      id: 'x1"><script>alert(1)</script>',
      type: "section",
      content: { width: "contained", background: "none", py: "lg", blocks: [], layout: { base: { gap: "4" } } },
    };
    const html = await renderAt(hostile);
    expect(html).not.toContain("<script>alert");
    // The class is stripped to safe chars only (no quotes/brackets/angle brackets).
    expect(html).toMatch(/class="pb-x1scriptalert1script"/);
  });
});

describe("custom-CSS escape hatch — re-sanitised + scoped at render", () => {
  it("injects sanitised, page-scoped CSS into a dedicated <style>", async () => {
    const block: BlockNode = {
      id: "s1",
      type: "section",
      content: {
        width: "contained", background: "none", py: "lg", blocks: [],
        customCss: ".headline { color: red }",
      },
    };
    const html = await renderAt(block);
    expect(html).toContain('<style data-custom-css="">');
    expect(html).toContain(`.${CUSTOM_SCOPE_CLASS} .headline`);
    expect(html).toMatch(/color:\s*red/);
  });

  it("re-sanitises at render even if a dangerous string reached the content (defence in depth)", async () => {
    const block: BlockNode = {
      id: "s2",
      type: "section",
      content: {
        width: "contained", background: "none", py: "lg", blocks: [],
        // Simulate a stored value that somehow bypassed save-time sanitisation.
        customCss: "a { background: url(javascript:alert(1)) } </style><script>x</script>",
      },
    };
    const html = await renderAt(block);
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<script>x");
    // The dangerous input sanitises to empty, so no custom-css style element at all.
    expect(html).not.toContain('data-custom-css');
  });

  it("a section without customCss emits no custom-css <style>", async () => {
    const block: BlockNode = {
      id: "s3",
      type: "section",
      content: { width: "contained", background: "none", py: "lg", blocks: [] },
    };
    const html = await renderAt(block);
    expect(html).not.toContain("data-custom-css");
  });
});
