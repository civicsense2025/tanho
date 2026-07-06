import { describe, expect, it } from "vitest";
import { referencedSymbolIds } from "./cycle";
import type { BlockNode } from "../types";

describe("referencedSymbolIds", () => {
  it("finds top-level symbol references", () => {
    const tree: BlockNode[] = [
      { id: "a", type: "heading", content: { text: "x" } },
      { id: "b", type: "symbol", content: { symbolId: "sym_1" } },
      { id: "c", type: "symbol", content: { symbolId: "sym_2" } },
    ];
    expect(referencedSymbolIds(tree)).toEqual(["sym_1", "sym_2"]);
  });

  it("finds symbol references nested inside containers", () => {
    const tree: BlockNode[] = [
      {
        id: "sec",
        type: "section",
        content: {
          blocks: [
            { id: "col", type: "columns", content: { blocks: [{ id: "s", type: "symbol", content: { symbolId: "deep" } }] } },
          ],
        },
      },
    ];
    expect(referencedSymbolIds(tree)).toEqual(["deep"]);
  });

  it("ignores symbol nodes with a missing/empty symbolId", () => {
    const tree: BlockNode[] = [
      { id: "b", type: "symbol", content: { symbolId: "" } },
      { id: "c", type: "symbol", content: {} },
    ];
    expect(referencedSymbolIds(tree)).toEqual([]);
  });

  it("returns [] for a tree with no symbols", () => {
    expect(referencedSymbolIds([{ id: "a", type: "heading", content: { text: "x" } }])).toEqual([]);
  });
});
