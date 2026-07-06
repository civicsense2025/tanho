import { describe, expect, it } from "vitest";
import {
  canNest,
  cloneWithIds,
  treeContains,
  treeFind,
  treeInsert,
  treeLocate,
  treeMove,
  treeRemove,
} from "./tree";
import type { BlockNode } from "./types";

const tree = (): BlockNode[] => [
  { id: "a", type: "heading", content: { text: "A" } },
  {
    id: "s",
    type: "section",
    content: {
      blocks: [
        { id: "b", type: "richtext", content: { md: "B" } },
        { id: "c", type: "heading", content: { text: "C" } },
      ],
    },
  },
];

describe("block tree ops", () => {
  it("finds nested blocks", () => {
    expect(treeFind(tree(), "c")?.content).toEqual({ text: "C" });
    expect(treeFind(tree(), "zz")).toBeNull();
  });

  it("locates with parent context", () => {
    expect(treeLocate(tree(), "b")).toEqual({ parentId: "s", index: 0, count: 2 });
    expect(treeLocate(tree(), "a")).toEqual({ parentId: null, index: 0, count: 2 });
  });

  it("removes from any depth", () => {
    const { blocks, removed } = treeRemove(tree(), "b");
    expect(removed?.id).toBe("b");
    expect(treeFind(blocks, "b")).toBeNull();
    expect(treeFind(blocks, "c")).not.toBeNull();
  });

  it("inserts into a parent at an index", () => {
    const n: BlockNode = { id: "x", type: "heading", content: {} };
    const out = treeInsert(tree(), "s", 1, n);
    const s = treeFind(out, "s")!;
    expect((s.content.blocks as BlockNode[]).map((b) => b.id)).toEqual(["b", "x", "c"]);
  });

  it("moves within a parent and clamps at edges", () => {
    const out = treeMove(tree(), "c", -1);
    const s = treeFind(out, "s")!;
    expect((s.content.blocks as BlockNode[]).map((b) => b.id)).toEqual(["c", "b"]);
    expect(treeMove(tree(), "a", -1)).toEqual(tree());
  });

  it("knows subtree containment", () => {
    expect(treeContains(tree(), "s", "b")).toBe(true);
    expect(treeContains(tree(), "s", "a")).toBe(false);
  });

  it("clones with fresh ids recursively", () => {
    const s = treeFind(tree(), "s")!;
    const clone = cloneWithIds(s);
    expect(clone.id).not.toBe("s");
    const kidIds = (clone.content.blocks as BlockNode[]).map((b) => b.id);
    expect(kidIds).not.toContain("b");
    expect(kidIds).toHaveLength(2);
  });

  it("enforces nesting rules", () => {
    expect(canNest(null, "section")).toBe(true);
    expect(canNest("section", "section")).toBe(false);
    expect(canNest("row", "columns")).toBe(false);
    expect(canNest("container", "heading")).toBe(true);
  });

  it("enforces chrome nesting rules (chrome is now a full content area)", () => {
    // chrome containers sit at the tree root only.
    expect(canNest(null, "site-header")).toBe(true);
    expect(canNest(null, "site-footer")).toBe(true);
    expect(canNest("section", "site-header")).toBe(false); // never nested in a page
    expect(canNest("site-header", "site-footer")).toBe(false); // never in each other

    // chrome containers accept chrome sub-blocks AND ordinary content/media/layout.
    expect(canNest("site-header", "logo")).toBe(true);
    expect(canNest("site-header", "nav-menu")).toBe(true);
    expect(canNest("site-footer", "footer-column")).toBe(true);
    expect(canNest("site-header", "heading")).toBe(true); // content in chrome ✓
    expect(canNest("site-header", "richtext")).toBe(true);
    expect(canNest("site-header", "section")).toBe(true); // layout in chrome ✓

    // chrome SUB-blocks need chrome/menu context: allowed in a chrome container
    // or a layout container (which groups them in a chrome tree), but NEVER at
    // the page root — the page picker doesn't offer them, and this backstops it.
    expect(canNest(null, "logo")).toBe(false);
    expect(canNest(null, "nav-menu")).toBe(false);
    expect(canNest("section", "logo")).toBe(true); // layout container groups chrome subs
    expect(canNest("container", "nav-menu")).toBe(true);

    // announcement additionally sits at the chrome root (a top strip beside the
    // header) so a seeded one is drag-reorderable.
    expect(canNest(null, "announcement")).toBe(true);
    expect(canNest("site-header", "announcement")).toBe(true);
    expect(canNest("section", "announcement")).toBe(true);
  });
});
