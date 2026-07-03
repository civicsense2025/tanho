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
});
