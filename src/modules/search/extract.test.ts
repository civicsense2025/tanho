import { describe, expect, it } from "vitest";
import { indexBlockTree } from "./extract";
import type { BlockNode } from "@/blocks/types";

describe("indexBlockTree", () => {
  it("extracts heading and richtext prose in document order", () => {
    const blocks: BlockNode[] = [
      { id: "h", type: "heading", content: { text: "Getting started", level: "h1", align: "left" } },
      { id: "r", type: "richtext", content: { md: "Write **freely** here.", html: "" } },
    ];
    const text = indexBlockTree(blocks);
    expect(text).toContain("Getting started");
    expect(text).toContain("Write freely here.");
    expect(text.indexOf("Getting started")).toBeLessThan(text.indexOf("Write freely"));
  });

  it("prefers richtext html over md when both are set (matches Render's own precedence)", () => {
    const blocks: BlockNode[] = [
      { id: "r", type: "richtext", content: { md: "markdown version", html: "<p>html version</p>" } },
    ];
    const text = indexBlockTree(blocks);
    expect(text).toContain("html version");
    expect(text).not.toContain("markdown version");
  });

  it("strips markdown/HTML markup down to plain text", () => {
    const blocks: BlockNode[] = [
      { id: "r", type: "richtext", content: { md: "# Not a real heading\n\nSome *emphasis* and a [link](https://example.com).", html: "" } },
    ];
    const text = indexBlockTree(blocks);
    expect(text).not.toContain("<");
    expect(text).not.toContain("*emphasis*");
    expect(text).toContain("emphasis");
    expect(text).toContain("link");
  });

  it("walks into layout containers (section/container/row/columns) to reach nested prose", () => {
    const blocks: BlockNode[] = [
      {
        id: "sec",
        type: "section",
        content: {
          blocks: [{ id: "h", type: "heading", content: { text: "Nested heading", level: "h2", align: "left" } }],
        },
      },
    ];
    expect(indexBlockTree(blocks)).toContain("Nested heading");
  });

  it("extracts accordion Q&A, list items, quote text+cite, callout title+body", () => {
    const blocks: BlockNode[] = [
      { id: "q", type: "quote", content: { text: "The details are the design.", cite: "Charles Eames" } },
      { id: "c", type: "callout", content: { tone: "info", title: "Good to know", body: "A short note." } },
      { id: "l", type: "list", content: { style: "bullet", items: ["First point", "Second point"] } },
      {
        id: "a",
        type: "accordion",
        content: { items: [{ q: "How does this work?", a: "Open a row to reveal its answer." }] },
      },
    ];
    const text = indexBlockTree(blocks);
    expect(text).toContain("The details are the design.");
    expect(text).toContain("Charles Eames");
    expect(text).toContain("Good to know");
    expect(text).toContain("A short note.");
    expect(text).toContain("First point");
    expect(text).toContain("Second point");
    expect(text).toContain("How does this work?");
    expect(text).toContain("Open a row to reveal its answer.");
  });

  it("never emits text from content behind a paywall the anonymous viewer fails — the load-bearing guarantee", () => {
    const blocks: BlockNode[] = [
      { id: "free", type: "heading", content: { text: "public teaser", level: "h1", align: "left" } },
      { id: "wall", type: "paywall", content: { tier: "", title: "Members only" } },
      { id: "gated", type: "richtext", content: { md: "this is a members-only secret", html: "" } },
    ];
    const text = indexBlockTree(blocks);
    expect(text).toContain("public teaser");
    expect(text).not.toContain("members-only secret");
  });

  it("re-gates a stricter nested paywall within an outer preview window (mirrors gating.test.tsx's invariant)", () => {
    const blocks: BlockNode[] = [
      { id: "outerWall", type: "paywall", content: { tier: "", title: "Members", anonPreviewBlocks: 3, subscriberPreviewBlocks: 0 } },
      { id: "teaser", type: "heading", content: { text: "teaser text", level: "h2", align: "left" } },
      { id: "innerWall", type: "paywall", content: { tier: "founding", title: "Founding members only" } },
      { id: "reallySecret", type: "richtext", content: { md: "founding-only secret", html: "" } },
    ];
    const text = indexBlockTree(blocks);
    expect(text).toContain("teaser text");
    expect(text).not.toContain("founding-only secret");
  });

  it("indexes preview-window content past a wall the anonymous viewer partially sees", () => {
    const blocks: BlockNode[] = [
      { id: "wall", type: "paywall", content: { tier: "", title: "Members", anonPreviewBlocks: 1 } },
      { id: "preview", type: "heading", content: { text: "one free block past the wall", level: "h2", align: "left" } },
      { id: "gated", type: "richtext", content: { md: "still gated after the preview window", html: "" } },
    ];
    const text = indexBlockTree(blocks);
    expect(text).toContain("one free block past the wall");
    expect(text).not.toContain("still gated after the preview window");
  });

  it("skips structural/navigational/commerce-UI block types entirely (no text of their own)", () => {
    const blocks: BlockNode[] = [
      { id: "btns", type: "buttons", content: { align: "left", items: [{ label: "Click me", href: "#", variant: "solid", target: "_self" }] } },
      { id: "nav", type: "nav-menu", content: { menuId: "main", ariaLabel: "Primary" } },
      { id: "prod", type: "product", content: { name: "Widget", priceLabel: "$10", href: "/shop" } },
    ];
    const text = indexBlockTree(blocks);
    expect(text).toBe("");
  });

  it("returns an empty string for an empty tree", () => {
    expect(indexBlockTree([])).toBe("");
  });

  it("collapses whitespace and trims the final result", () => {
    const blocks: BlockNode[] = [
      { id: "h", type: "heading", content: { text: "  spaced   out  ", level: "h1", align: "left" } },
    ];
    expect(indexBlockTree(blocks)).toBe("spaced out");
  });
});
