import { describe, expect, it, vi } from "vitest";

/**
 * The graceful-degradation contract: a block that declares `requiresCapability` must be
 * hidden from the picker AND skipped by the renderer when the optional dependency is
 * absent — never a crash. lottie-web IS installed in dev, so we assert the present path
 * directly and the absent path by mocking hasCapability.
 */
describe("optional-capability graceful degradation", () => {
  it("lottie-web is resolvable in this install → lottie capability is available", async () => {
    const { hasCapability } = await import("./capabilities");
    expect(hasCapability("lottie")).toBe(true);
  });

  it("pickerDefs INCLUDES lottie when its capability is available", async () => {
    const { pickerDefs } = await import("./registry");
    const types = pickerDefs().map((d) => d.type);
    expect(types).toContain("lottie");
  });

  it("pickerDefs HIDES a capability-gated block when the dep is absent", async () => {
    vi.resetModules();
    // Mock capabilities so lottie reads as unavailable, then re-import the registry.
    vi.doMock("./capabilities", () => ({
      hasCapability: (cap: string) => cap !== "lottie",
    }));
    const { pickerDefs, blockAvailable, blockDef } = await import("./registry");
    const types = pickerDefs().map((d) => d.type);
    expect(types).not.toContain("lottie");
    // Non-gated blocks are unaffected.
    expect(types).toContain("heading");
    // blockAvailable reflects it directly.
    expect(blockAvailable(blockDef("lottie")!)).toBe(false);
    expect(blockAvailable(blockDef("heading")!)).toBe(true);
    vi.doUnmock("./capabilities");
    vi.resetModules();
  });
});
