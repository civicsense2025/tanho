import { describe, expect, it } from "vitest";
import { paywallSchema } from "./fields";
import { viewerPassesPaywall, visibleBlocksFor } from "./gate";
import type { BlockNode, RenderViewer } from "../types";

const anon: RenderViewer = null;
const freeReader: RenderViewer = { personId: "p1", memberActive: false, tier: null };
const member: RenderViewer = { personId: "p2", memberActive: true, tier: "member" };
const founding: RenderViewer = { personId: "p3", memberActive: true, tier: "founding" };

const anyMember = paywallSchema.parse({ tier: "" });
const tieredWall = paywallSchema.parse({ tier: "founding" });

describe("viewerPassesPaywall", () => {
  it("blocks anonymous viewers always", () => {
    expect(viewerPassesPaywall(anon, anyMember)).toBe(false);
    expect(viewerPassesPaywall(anon, tieredWall)).toBe(false);
  });

  it("blocks free (non-member) readers", () => {
    expect(viewerPassesPaywall(freeReader, anyMember)).toBe(false);
  });

  it("lets any active member past an untiered wall", () => {
    expect(viewerPassesPaywall(member, anyMember)).toBe(true);
    expect(viewerPassesPaywall(founding, anyMember)).toBe(true);
  });

  it("enforces the exact tier on a tiered wall", () => {
    expect(viewerPassesPaywall(member, tieredWall)).toBe(false);
    expect(viewerPassesPaywall(founding, tieredWall)).toBe(true);
  });
});

const heading = (id: string, text: string): BlockNode => ({
  id,
  type: "heading",
  content: { text, level: "h2" },
});
const paywall = (id: string, tier = ""): BlockNode => ({ id, type: "paywall", content: { tier } });
const section = (id: string, blocks: BlockNode[]): BlockNode => ({
  id,
  type: "section",
  content: { blocks },
});

describe("visibleBlocksFor — the paywall cut's pure mirror", () => {
  it("is the identity for a tree with no paywalls", () => {
    const tree = [heading("a", "A"), section("s", [heading("b", "B")])];
    expect(visibleBlocksFor(anon, tree)).toEqual(tree);
  });

  it("truncates every sibling after a failed paywall (anonymous viewer)", () => {
    const tree = [heading("a", "Free"), paywall("pw"), heading("b", "Gated")];
    expect(visibleBlocksFor(anon, tree).map((b) => b.id)).toEqual(["a"]);
  });

  it("keeps post-paywall content for a passing member (banner dropped, like the walker)", () => {
    const tree = [heading("a", "Free"), paywall("pw"), heading("b", "Members")];
    expect(visibleBlocksFor(member, tree).map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("applies the cut inside nested containers without touching outer siblings", () => {
    const tree = [
      section("s", [heading("in1", "In free"), paywall("pw"), heading("in2", "In gated")]),
      heading("after", "After section"),
    ];
    const visible = visibleBlocksFor(anon, tree);
    expect(visible.map((b) => b.id)).toEqual(["s", "after"]);
    const kids = (visible[0]!.content as { blocks: BlockNode[] }).blocks;
    expect(kids.map((b) => b.id)).toEqual(["in1"]);
  });

  it("never mutates the input tree", () => {
    const inner = [heading("in1", "A"), paywall("pw"), heading("in2", "B")];
    const tree = [section("s", inner)];
    visibleBlocksFor(anon, tree);
    expect(inner).toHaveLength(3);
    expect((tree[0]!.content as { blocks: BlockNode[] }).blocks).toHaveLength(3);
  });

  it("truncates a DEEPLY nested container even when the parent's child count is unchanged", () => {
    // Outer container's direct children: [innerContainer, publicHeading] — count 2.
    // Inner container is internally truncated (its gated heading withheld) but is
    // still present, so the outer count stays 2. A length-only "unchanged" check
    // would re-attach the ORIGINAL outer node and leak the gated heading.
    const tree = [
      section("outer", [
        section("inner", [paywall("pw"), heading("secret", "Secret members-only")]),
        heading("pub", "Public heading"),
      ]),
    ];
    const visible = visibleBlocksFor(anon, tree);
    const outerKids = (visible[0]!.content as { blocks: BlockNode[] }).blocks;
    const innerKids = (outerKids[0]!.content as { blocks: BlockNode[] }).blocks;
    // Inner container is emptied (paywall is its first child → all withheld);
    // the gated heading must NOT survive anywhere in the visible tree.
    expect(innerKids).toEqual([]);
    expect(outerKids.map((b) => b.id)).toEqual(["inner", "pub"]);
    const allIds = JSON.stringify(visible);
    expect(allIds).not.toContain("secret");
    expect(allIds).not.toContain("Secret members-only");
  });
});
