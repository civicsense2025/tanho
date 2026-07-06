import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RenderViewer } from "@/blocks/types";

const hasPackEntitlement = vi.fn();
vi.mock("@/modules/marketplace/entitlements", () => ({
  hasPackEntitlement: (...args: unknown[]) => hasPackEntitlement(...args),
}));

const anon: RenderViewer = null;
const freeReader: RenderViewer = { personId: "p1", memberActive: false, tier: null };
const member: RenderViewer = { personId: "p2", memberActive: true, tier: "member" };
const founding: RenderViewer = { personId: "p3", memberActive: true, tier: "founding" };

describe("resolveMembershipGate", () => {
  beforeEach(() => {
    hasPackEntitlement.mockReset();
  });

  it("blocks anonymous viewers always", async () => {
    const { resolveMembershipGate } = await import("./gate");
    expect(resolveMembershipGate(anon, { kind: "membership", tier: "" })).toEqual({
      passed: false,
      reason: "anonymous",
    });
    expect(resolveMembershipGate(anon, { kind: "membership", tier: "founding" })).toEqual({
      passed: false,
      reason: "anonymous",
    });
  });

  it("blocks free (non-member) readers", async () => {
    const { resolveMembershipGate } = await import("./gate");
    expect(resolveMembershipGate(freeReader, { kind: "membership", tier: "" }).passed).toBe(false);
  });

  it("lets any active member past an untiered gate", async () => {
    const { resolveMembershipGate } = await import("./gate");
    expect(resolveMembershipGate(member, { kind: "membership", tier: "" })).toEqual({ passed: true });
    expect(resolveMembershipGate(founding, { kind: "membership", tier: "" })).toEqual({ passed: true });
  });

  it("enforces the exact tier on a tiered gate", async () => {
    const { resolveMembershipGate } = await import("./gate");
    expect(resolveMembershipGate(member, { kind: "membership", tier: "founding" })).toEqual({
      passed: false,
      reason: "wrong-tier",
    });
    expect(resolveMembershipGate(founding, { kind: "membership", tier: "founding" })).toEqual({
      passed: true,
    });
  });

  it("fails closed on a pack gate (sync path can't check entitlement DB)", async () => {
    const { resolveMembershipGate } = await import("./gate");
    expect(
      resolveMembershipGate(member, { kind: "pack", packType: "block_pack", packEntryId: "e1" }),
    ).toEqual({ passed: false, reason: "not-entitled" });
  });

  it("any: passes if at least one sub-gate passes", async () => {
    const { resolveMembershipGate } = await import("./gate");
    const gate = {
      kind: "any" as const,
      gates: [
        { kind: "membership" as const, tier: "founding" },
        { kind: "membership" as const, tier: "" },
      ],
    };
    expect(resolveMembershipGate(member, gate)).toEqual({ passed: true });
    expect(resolveMembershipGate(freeReader, gate).passed).toBe(false);
  });

  it("all: requires every sub-gate to pass", async () => {
    const { resolveMembershipGate } = await import("./gate");
    const gate = {
      kind: "all" as const,
      gates: [
        { kind: "membership" as const, tier: "" },
        { kind: "membership" as const, tier: "founding" },
      ],
    };
    expect(resolveMembershipGate(founding, gate)).toEqual({ passed: true });
    expect(resolveMembershipGate(member, gate)).toEqual({ passed: false, reason: "wrong-tier" });
  });

  it("all: fails closed on an empty gates array — never vacuously passes anonymous or any other viewer", async () => {
    const { resolveMembershipGate } = await import("./gate");
    const emptyAll = { kind: "all" as const, gates: [] };
    expect(resolveMembershipGate(anon, emptyAll).passed).toBe(false);
    expect(resolveMembershipGate(freeReader, emptyAll).passed).toBe(false);
    expect(resolveMembershipGate(founding, emptyAll).passed).toBe(false);
  });
});

describe("resolveEntitlement", () => {
  beforeEach(() => {
    hasPackEntitlement.mockReset();
  });

  it("delegates membership gates to resolveMembershipGate", async () => {
    const { resolveEntitlement } = await import("./gate");
    await expect(resolveEntitlement(founding, { kind: "membership", tier: "founding" })).resolves.toEqual({
      passed: true,
    });
    expect(hasPackEntitlement).not.toHaveBeenCalled();
  });

  it("blocks anonymous viewers on a pack gate without a DB call", async () => {
    const { resolveEntitlement } = await import("./gate");
    await expect(
      resolveEntitlement(anon, { kind: "pack", packType: "design_pack", packEntryId: "e1" }),
    ).resolves.toEqual({ passed: false, reason: "anonymous" });
    expect(hasPackEntitlement).not.toHaveBeenCalled();
  });

  it("checks hasPackEntitlement for a signed-in viewer's pack gate", async () => {
    hasPackEntitlement.mockResolvedValue(true);
    const { resolveEntitlement } = await import("./gate");
    await expect(
      resolveEntitlement(freeReader, { kind: "pack", packType: "block_pack", packEntryId: "e1" }),
    ).resolves.toEqual({ passed: true });
    expect(hasPackEntitlement).toHaveBeenCalledWith("p1", "block_pack", "e1");
  });

  it("reports not-entitled when hasPackEntitlement returns false", async () => {
    hasPackEntitlement.mockResolvedValue(false);
    const { resolveEntitlement } = await import("./gate");
    await expect(
      resolveEntitlement(freeReader, { kind: "pack", packType: "block_pack", packEntryId: "e1" }),
    ).resolves.toEqual({ passed: false, reason: "not-entitled" });
  });

  it("any: short-circuits on the first passing sub-gate, including a pack gate", async () => {
    hasPackEntitlement.mockResolvedValue(true);
    const { resolveEntitlement } = await import("./gate");
    const gate = {
      kind: "any" as const,
      gates: [
        { kind: "membership" as const, tier: "founding" },
        { kind: "pack" as const, packType: "block_pack" as const, packEntryId: "e1" },
      ],
    };
    await expect(resolveEntitlement(freeReader, gate)).resolves.toEqual({ passed: true });
  });

  it("all: requires every sub-gate, including a pack gate, to pass", async () => {
    hasPackEntitlement.mockResolvedValue(false);
    const { resolveEntitlement } = await import("./gate");
    const gate = {
      kind: "all" as const,
      gates: [
        { kind: "membership" as const, tier: "" },
        { kind: "pack" as const, packType: "block_pack" as const, packEntryId: "e1" },
      ],
    };
    await expect(resolveEntitlement(member, gate)).resolves.toEqual({
      passed: false,
      reason: "not-entitled",
    });
  });

  it("all: fails closed on an empty gates array, without making a DB call", async () => {
    const { resolveEntitlement } = await import("./gate");
    const emptyAll = { kind: "all" as const, gates: [] };
    await expect(resolveEntitlement(anon, emptyAll)).resolves.toMatchObject({ passed: false });
    await expect(resolveEntitlement(founding, emptyAll)).resolves.toMatchObject({ passed: false });
    expect(hasPackEntitlement).not.toHaveBeenCalled();
  });
});
