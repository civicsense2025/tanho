import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PreviewChrome } from "./PreviewChrome";
import type { BlockNode } from "@/blocks/types";

const header: BlockNode[] = [
  { id: "h", type: "site-header", content: { sticky: true, layout: "spread", blocks: [
    { id: "lg", type: "logo", content: { text: "Acme", style: "wordmark", _resolved: { siteName: "Acme" } } },
    { id: "hd", type: "heading", content: { text: "In-header content", level: "h2", align: "left" } },
  ] } },
];
const footer: BlockNode[] = [
  { id: "f", type: "site-footer", content: { blocks: [
    { id: "cr", type: "richtext", content: { md: "© Acme" } },
  ] } },
];

describe("PreviewChrome renders real chrome bands in the builder", () => {
  it("renders header + footer bands with Edit deep-links, real chrome, and in-header content", () => {
    const html = renderToStaticMarkup(
      <PreviewChrome status="published" device="desktop" headerBlocks={header} footerBlocks={footer}>
        <div>PAGE CANVAS</div>
      </PreviewChrome>,
    );
    expect(html).toContain('data-chrome-band="header"');
    expect(html).toContain('data-chrome-band="footer"');
    expect(html).toContain("<header"); // the real site-header landmark renders
    expect(html).toContain("<footer");
    expect(html).toContain("Acme"); // logo resolved
    expect(html).toContain("Edit header");
    expect(html).toContain("/admin/nav/footer");
    // W2a: a content block (heading) renders INSIDE the header
    expect(html).toContain("In-header content");
    expect(html).toContain("PAGE CANVAS"); // canvas still in the middle
    expect(html).toContain("--header-height:61px"); // published on the frame
    // No fake browser chrome — real displays only.
    expect(html).not.toContain("yoursite");
  });

  it("renders no bands when chrome trees are empty", () => {
    const html = renderToStaticMarkup(
      <PreviewChrome status="draft" device="desktop"><div>C</div></PreviewChrome>,
    );
    expect(html).not.toContain("data-chrome-band");
    expect(html).toContain("C");
  });
});
