import { describe, expect, it } from "vitest";
import { resolveTreeGate, treeHasPaywall } from "./blocks-io";
import type { BlockNode } from "@/blocks/types";

describe("resolveTreeGate", () => {
  it("returns null for a tree with no paywall", () => {
    const blocks: BlockNode[] = [
      { id: "h", type: "heading", content: { text: "Hello", level: "h1", align: "left" } },
    ];
    expect(resolveTreeGate(blocks)).toBeNull();
  });

  it("returns a membership gate with the paywall's tier", () => {
    const blocks: BlockNode[] = [
      { id: "wall", type: "paywall", content: { tier: "founding", title: "x" } },
    ];
    expect(resolveTreeGate(blocks)).toEqual({ kind: "membership", tier: "founding" });
  });

  it("an untiered paywall resolves to an empty-string tier (any active member)", () => {
    const blocks: BlockNode[] = [
      { id: "wall", type: "paywall", content: { tier: "", title: "x" } },
    ];
    expect(resolveTreeGate(blocks)).toEqual({ kind: "membership", tier: "" });
  });

  it("finds a paywall nested inside a layout container", () => {
    const blocks: BlockNode[] = [
      {
        id: "sec",
        type: "section",
        content: { blocks: [{ id: "wall", type: "paywall", content: { tier: "member", title: "x" } }] },
      },
    ];
    expect(resolveTreeGate(blocks)).toEqual({ kind: "membership", tier: "member" });
  });

  it("returns the FIRST paywall found when several exist at different tiers", () => {
    const blocks: BlockNode[] = [
      { id: "wall1", type: "paywall", content: { tier: "member", title: "x" } },
      { id: "wall2", type: "paywall", content: { tier: "founding", title: "x" } },
    ];
    expect(resolveTreeGate(blocks)).toEqual({ kind: "membership", tier: "member" });
  });

  it("agrees with treeHasPaywall on whether a gate exists", () => {
    const withWall: BlockNode[] = [{ id: "wall", type: "paywall", content: { tier: "", title: "x" } }];
    const withoutWall: BlockNode[] = [{ id: "h", type: "heading", content: { text: "x", level: "h1", align: "left" } }];
    expect(resolveTreeGate(withWall) !== null).toBe(treeHasPaywall(withWall));
    expect(resolveTreeGate(withoutWall) !== null).toBe(treeHasPaywall(withoutWall));
  });
});
