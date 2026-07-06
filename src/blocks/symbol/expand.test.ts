import { describe, expect, it } from "vitest";
import { applyOverrides, decideExpansion, MAX_SYMBOL_DEPTH } from "./expand";
import type { BlockNode } from "../types";

describe("decideExpansion (pre-fetch guard)", () => {
  it("ok for a fresh symbol not in the stack", () => {
    expect(decideExpansion("sym_a", [])).toBe("ok");
    expect(decideExpansion("sym_a", ["sym_b"])).toBe("ok");
    expect(decideExpansion("sym_a", undefined)).toBe("ok");
  });

  it("unset when there is no symbolId", () => {
    expect(decideExpansion("", [])).toBe("unset");
  });

  it("cycle when the symbol is already being expanded up this branch", () => {
    expect(decideExpansion("sym_a", ["sym_a"])).toBe("cycle");
    expect(decideExpansion("sym_a", ["sym_b", "sym_a", "sym_c"])).toBe("cycle");
  });

  it("deep when the stack is at the depth cap", () => {
    const deepStack = Array.from({ length: MAX_SYMBOL_DEPTH }, (_, i) => `s${i}`);
    expect(decideExpansion("sym_new", deepStack)).toBe("deep");
  });

  it("cycle takes precedence over deep", () => {
    const stack = Array.from({ length: MAX_SYMBOL_DEPTH }, (_, i) => `s${i}`);
    expect(decideExpansion("s0", stack)).toBe("cycle"); // s0 is in stack AND stack is deep
  });
});

describe("applyOverrides", () => {
  const tree = (): BlockNode[] => [
    { id: "h1", type: "heading", content: { text: "Original", level: "h2" } },
    {
      id: "sec",
      type: "section",
      content: { blocks: [{ id: "b1", type: "buttons", content: { align: "left", items: [] } }] },
    },
  ];

  it("returns a deep copy unchanged when there are no overrides", () => {
    const t = tree();
    const out = applyOverrides(t);
    expect(out).toEqual(t);
    expect(out).not.toBe(t); // fresh tree
    expect(out[0]).not.toBe(t[0]);
  });

  it("shallow-merges a patch onto the targeted child by id", () => {
    const out = applyOverrides(tree(), [{ targetId: "h1", patch: { text: "Overridden" } }]);
    expect(out[0].content).toEqual({ text: "Overridden", level: "h2" }); // patch wins, rest kept
  });

  it("patches a nested child inside a container", () => {
    const out = applyOverrides(tree(), [{ targetId: "b1", patch: { align: "center" } }]);
    const kids = (out[1].content as { blocks: BlockNode[] }).blocks;
    expect(kids[0].content).toMatchObject({ align: "center", items: [] });
  });

  it("silently ignores an override whose targetId is not in the tree (drift-safe)", () => {
    const out = applyOverrides(tree(), [{ targetId: "gone", patch: { text: "X" } }]);
    expect(out[0].content).toEqual({ text: "Original", level: "h2" });
  });

  it("does not mutate the input tree", () => {
    const t = tree();
    const snap = JSON.parse(JSON.stringify(t));
    applyOverrides(t, [{ targetId: "h1", patch: { text: "X" } }]);
    expect(t).toEqual(snap);
  });
});
