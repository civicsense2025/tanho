import { describe, expect, it } from "vitest";
import { paywallSchema } from "./fields";
import { viewerPassesPaywall } from "./gate";
import type { RenderViewer } from "../types";

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
