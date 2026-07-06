import { describe, expect, it } from "vitest";
import { donationsSettingsSchema } from "./validation";

const BASE = { minCents: 500, presetCents: 2500, maxCents: 10_000_00 };

describe("donationsSettingsSchema — min/preset/max cross-validation", () => {
  it("accepts a sane range", () => {
    expect(donationsSettingsSchema.safeParse(BASE).success).toBe(true);
  });

  it("rejects minCents > maxCents", () => {
    const result = donationsSettingsSchema.safeParse({ ...BASE, minCents: 5000, maxCents: 500 });
    expect(result.success).toBe(false);
  });

  it("rejects presetCents below minCents", () => {
    const result = donationsSettingsSchema.safeParse({ ...BASE, minCents: 3000, presetCents: 1000 });
    expect(result.success).toBe(false);
  });

  it("rejects presetCents above maxCents", () => {
    const result = donationsSettingsSchema.safeParse({ ...BASE, maxCents: 1000, presetCents: 2500 });
    expect(result.success).toBe(false);
  });

  it("defaults to a valid range", () => {
    const result = donationsSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
