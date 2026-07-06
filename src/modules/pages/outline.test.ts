import { describe, expect, it } from "vitest";
import { buildOutline } from "./outline";
import type { BlockNode } from "@/blocks/types";

const heading = (id: string, text: string, level = "h2"): BlockNode => ({
  id,
  type: "heading",
  content: { text, level },
});

describe("buildOutline", () => {
  it("collects headings in document order with levels", () => {
    const { headings } = buildOutline([
      heading("a", "Intro", "h2"),
      heading("b", "Details", "h3"),
      heading("c", "Wrap up", "h2"),
    ]);
    expect(headings).toEqual([
      { id: "intro", text: "Intro", level: 2 },
      { id: "details", text: "Details", level: 3 },
      { id: "wrap-up", text: "Wrap up", level: 2 },
    ]);
  });

  it("recurses into layout blocks' content.blocks", () => {
    const tree: BlockNode[] = [
      {
        id: "sec",
        type: "section",
        content: { blocks: [heading("h1", "Nested", "h2")] },
      },
    ];
    const { headings } = buildOutline(tree);
    expect(headings.map((h) => h.text)).toEqual(["Nested"]);
  });

  it("dedupes repeated headings and maps ids by block id", () => {
    const { headings, byBlockId } = buildOutline([
      heading("a", "Overview"),
      heading("b", "Overview"),
    ]);
    expect(headings.map((h) => h.id)).toEqual(["overview", "overview-2"]);
    expect(byBlockId).toEqual({ a: "overview", b: "overview-2" });
  });

  it("skips headings with blank text", () => {
    const { headings } = buildOutline([heading("a", "   "), heading("b", "Real")]);
    expect(headings.map((h) => h.text)).toEqual(["Real"]);
  });

  it("ignores non-heading blocks", () => {
    const { headings } = buildOutline([
      { id: "r", type: "richtext", content: { md: "# Not a heading block" } },
      heading("h", "Actual"),
    ]);
    expect(headings.map((h) => h.text)).toEqual(["Actual"]);
  });

  it("dedupes section anchorIds against heading slugs in ONE namespace", () => {
    const { headings, byBlockId } = buildOutline([
      { id: "sec", type: "section", content: { anchorId: "setup", blocks: [] } },
      heading("h", "Setup"),
    ]);
    // The section claimed "setup" first (document order); the heading defers.
    expect(byBlockId).toEqual({ sec: "setup", h: "setup-2" });
    // Only the heading feeds the TOC; the section anchor is a jump target only.
    expect(headings).toEqual([{ id: "setup-2", text: "Setup", level: 2 }]);
  });

  it("reports every block type present (for the route's context decisions)", () => {
    const { types } = buildOutline([
      heading("h", "A"),
      {
        id: "sec",
        type: "section",
        content: { blocks: [{ id: "bc", type: "breadcrumbs", content: {} }] },
      },
    ]);
    expect(types.has("heading")).toBe(true);
    expect(types.has("section")).toBe(true);
    expect(types.has("breadcrumbs")).toBe(true);
    expect(types.has("table-of-contents")).toBe(false);
  });
});
