import { describe, expect, it } from "vitest";
import { RenderBlocks } from "./BlockRenderer";
import type { BlockNode, ReactElementWithKey, RenderViewer } from "./gating.testkit";

/**
 * The load-bearing security test: content after a paywall must NOT be emitted
 * by the walker for a viewer who can't pass. RenderBlocks returns an array of
 * <RenderBlock> elements (keyed by block id) BEFORE the async leaf renders —
 * so the set of keys present in that array is exactly the set of blocks whose
 * content will ever be serialized. We assert gated blocks are absent from it.
 */
const tree: BlockNode[] = [
  { id: "free1", type: "heading", content: { text: "teaser", level: "h1", align: "left" } },
  { id: "wall", type: "paywall", content: { tier: "", title: "Members only" } },
  { id: "gated1", type: "heading", content: { text: "secret", level: "h2", align: "left" } },
  { id: "gated2", type: "richtext", content: { md: "secret prose", html: "" } },
];

function emittedKeys(viewer: RenderViewer): string[] {
  const nodes = RenderBlocks({ blocks: tree, viewer, mode: "public" }) as ReactElementWithKey[];
  return nodes.map((n) => String(n.key));
}

describe("paywall walker gating", () => {
  it("emits the wall but no gated block for anonymous viewers", () => {
    const keys = emittedKeys(null);
    expect(keys).toContain("free1");
    expect(keys).toContain("wall");
    expect(keys).not.toContain("gated1");
    expect(keys).not.toContain("gated2");
  });

  it("emits no gated block for non-members", () => {
    const keys = emittedKeys({ personId: "p", memberActive: false, tier: null });
    expect(keys).not.toContain("gated1");
    expect(keys).not.toContain("gated2");
  });

  it("emits gated blocks and drops the wall for active members", () => {
    const keys = emittedKeys({ personId: "p", memberActive: true, tier: "member" });
    expect(keys).toContain("gated1");
    expect(keys).toContain("gated2");
    expect(keys).not.toContain("wall");
  });
});
