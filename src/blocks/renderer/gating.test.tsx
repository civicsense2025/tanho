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

describe("paywall preview depth", () => {
  function treeWithPreview(anonPreviewBlocks: number, subscriberPreviewBlocks: number): BlockNode[] {
    return [
      { id: "free1", type: "heading", content: { text: "teaser", level: "h1", align: "left" } },
      {
        id: "wall",
        type: "paywall",
        content: { tier: "", title: "Members only", anonPreviewBlocks, subscriberPreviewBlocks },
      },
      { id: "gated1", type: "heading", content: { text: "secret", level: "h2", align: "left" } },
      { id: "gated2", type: "richtext", content: { md: "secret prose", html: "" } },
      { id: "gated3", type: "richtext", content: { md: "more secret prose", html: "" } },
    ];
  }

  function emittedKeysFor(viewer: RenderViewer, tree: BlockNode[]): string[] {
    const nodes = RenderBlocks({ blocks: tree, viewer, mode: "public" }) as ReactElementWithKey[];
    return nodes.map((n) => String(n.key));
  }

  it("reveals exactly N blocks past the wall to an anonymous viewer, then cuts", () => {
    const keys = emittedKeysFor(null, treeWithPreview(1, 0));
    expect(keys).toContain("wall");
    expect(keys).toContain("gated1");
    expect(keys).not.toContain("gated2");
    expect(keys).not.toContain("gated3");
  });

  it("reveals exactly M blocks past the wall to a signed-in non-member", () => {
    const viewer: RenderViewer = { personId: "p", memberActive: false, tier: null };
    const keys = emittedKeysFor(viewer, treeWithPreview(0, 2));
    expect(keys).toContain("wall");
    expect(keys).toContain("gated1");
    expect(keys).toContain("gated2");
    expect(keys).not.toContain("gated3");
  });

  it("gives the anonymous allowance, not the subscriber allowance, to a signed-out visitor", () => {
    const keys = emittedKeysFor(null, treeWithPreview(1, 3));
    expect(keys).toContain("gated1");
    expect(keys).not.toContain("gated2");
  });

  it("a member still sees everything and the wall is dropped, regardless of preview depth", () => {
    const viewer: RenderViewer = { personId: "p", memberActive: true, tier: "member" };
    const keys = emittedKeysFor(viewer, treeWithPreview(1, 1));
    expect(keys).toContain("gated1");
    expect(keys).toContain("gated2");
    expect(keys).toContain("gated3");
    expect(keys).not.toContain("wall");
  });

  it("defaults to 0 preview blocks — identical to the historical binary cut", () => {
    const keys = emittedKeysFor(null, tree);
    expect(keys).not.toContain("gated1");
    expect(keys).not.toContain("gated2");
  });

  it("re-gates a stricter, nested paywall inside a preview window — it is not rendered as an inert banner", () => {
    // Outer wall: untiered, anonPreviewBlocks: 3 (generous — would reveal
    // "teaser", "innerWall", AND "reallySecret" if the inner wall weren't
    // re-evaluated as a real gate). Inner wall: tiered "founding" — a plain
    // anonymous visitor must still be blocked from "reallySecret" by the
    // inner wall, even though they're within the outer wall's preview
    // allowance.
    const nestedTree: BlockNode[] = [
      { id: "outerWall", type: "paywall", content: { tier: "", title: "Members", anonPreviewBlocks: 3, subscriberPreviewBlocks: 0 } },
      { id: "teaser", type: "heading", content: { text: "teaser", level: "h2", align: "left" } },
      { id: "innerWall", type: "paywall", content: { tier: "founding", title: "Founding members only" } },
      { id: "reallySecret", type: "richtext", content: { md: "founding-only secret", html: "" } },
    ];

    const anonKeys = emittedKeysFor(null, nestedTree);
    expect(anonKeys).toContain("outerWall");
    expect(anonKeys).toContain("teaser");
    expect(anonKeys).not.toContain("reallySecret"); // the inner, stricter wall must still gate this

    const foundingViewer: RenderViewer = { personId: "p", memberActive: true, tier: "founding" };
    const foundingKeys = emittedKeysFor(foundingViewer, nestedTree);
    expect(foundingKeys).toContain("reallySecret"); // a founding member passes both walls
  });
});
