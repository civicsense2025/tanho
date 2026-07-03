import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "./BlockRenderer";
import type { BlockNode, Device } from "../types";

// End-to-end for the PUBLIC render path: a styled block persisted as JSON goes
// through the walker (safeParse → hideOn → style resolve → wrapper) and emits the
// right token CSS at each device. RenderBlock is async; await then string-render.
async function renderAt(block: BlockNode, device: Device): Promise<string> {
  const el = await RenderBlock({ block, device, mode: "public", viewer: null });
  return renderToStaticMarkup(el);
}

const styled: BlockNode = {
  id: "h",
  type: "heading",
  content: {
    text: "Hi",
    level: "h2",
    align: "left",
    style: {
      base: { padTop: "2", textColor: "muted" },
      tablet: { padTop: "6" },
      desktop: { padTop: "12" },
    },
  },
};

describe("public render path — universal style layer", () => {
  it("applies base (mobile) style inline on the data-block wrapper", async () => {
    const html = await renderAt(styled, "mobile");
    expect(html).toContain("data-block");
    expect(html).toMatch(/padding-top:var\(--space-2\)/);
    expect(html).toMatch(/color:var\(--text-muted\)/);
  });

  it("scales up: tablet and desktop override padding, base colour persists", async () => {
    const tablet = await renderAt(styled, "tablet");
    expect(tablet).toMatch(/padding-top:var\(--space-6\)/);
    expect(tablet).toMatch(/color:var\(--text-muted\)/); // inherited from base

    const desktop = await renderAt(styled, "desktop");
    expect(desktop).toMatch(/padding-top:var\(--space-12\)/);
  });

  it("an unstyled block emits the plain wrapper (no wrapper style) — zero regression", async () => {
    const plain: BlockNode = { id: "p", type: "heading", content: { text: "Hi", level: "h2", align: "left" } };
    const html = await renderAt(plain, "desktop");
    // The style layer adds NOTHING to the data-block wrapper (heading's own inner
    // <h2 style> is unrelated and unchanged). Assert the wrapper tag has no style attr.
    expect(html).toMatch(/<div data-block="heading">/);
    expect(html).not.toContain("padding-top");
  });

  it("hideOn still hides on the matching device", async () => {
    const hidden: BlockNode = { id: "x", type: "heading", content: { text: "Hi", level: "h2", align: "left", hideOn: ["mobile"] } };
    const el = await RenderBlock({ block: hidden, device: "mobile", mode: "public", viewer: null });
    expect(el).toBeNull();
  });

  it("style applies to a BOUND block too (project-list) — Phase E", async () => {
    // Bound blocks resolve server data; with no records they render an empty state,
    // but the style wrapper still applies. We only assert the wrapper style here.
    const bound: BlockNode = {
      id: "pl",
      type: "project-list",
      content: { source: "project", eyebrow: "", style: { base: { padTop: "6", background: "surface" } } },
    };
    const html = await renderAt(bound, "mobile");
    expect(html).toContain('data-block="project-list"');
    expect(html).toMatch(/padding-top:var\(--space-6\)/);
    expect(html).toMatch(/background:var\(--surface\)/);
  });
});
