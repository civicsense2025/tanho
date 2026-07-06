import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "./BlockRenderer";
import { createBlock } from "../registry";
import type { BlockNode } from "../types";

/**
 * Smoke coverage for the six CSS-only display atoms (toggle/rating/alert/badge/
 * icon/faq). Each renders through the real public path (RenderBlock → HTML) from
 * its defaults, with no JS island. The load-bearing property is that these are
 * pure server-rendered HTML+CSS and never throw.
 */
async function render(block: BlockNode): Promise<string> {
  const el = await RenderBlock({ block, device: "desktop", mode: "public", viewer: null });
  return el ? renderToStaticMarkup(el) : "";
}

describe("CSS-only display atoms — render from defaults", () => {
  it("every new atom renders non-empty and wraps in its data-block", async () => {
    for (const type of ["toggle", "rating", "alert", "badge", "icon", "faq"]) {
      const html = await render(createBlock(type));
      expect(html, `${type} should render non-empty`).toContain(`data-block="${type}"`);
    }
  });

  it("toggle shows both option labels and the note", async () => {
    const html = await render(createBlock("toggle"));
    expect(html).toContain("Monthly");
    expect(html).toContain("Annual");
    expect(html).toContain("Save 20%");
  });

  it("rating renders max star glyphs and the numeric value", async () => {
    const html = await render(createBlock("rating")); // value 4.5, max 5
    // Five empty-star bases (☆), each with a clipped filled overlay (★).
    expect((html.match(/☆/g) ?? []).length).toBe(5);
    expect(html).toContain("4.5");
  });

  it("alert renders its title and body", async () => {
    const html = await render(createBlock("alert"));
    expect(html).toContain("Heads up");
    expect(html).toContain("A short status message");
  });

  it("badge renders its text", async () => {
    const html = await render(createBlock("badge"));
    expect(html).toContain("New");
  });

  it("icon renders the glyph", async () => {
    const html = await render(createBlock("icon"));
    expect(html).toContain("★");
  });

  it("faq renders <details> disclosure rows AND a FAQPage JSON-LD payload", async () => {
    const html = await render(createBlock("faq"));
    expect(html).toMatch(/<details/);
    expect(html).toContain("How does this work?");
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"Question"');
    expect(html).toContain("application/ld+json");
  });
});
