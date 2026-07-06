import { describe, expect, it } from "vitest";
import {
  createFamilySchema,
  familyNameSchema,
  fontPerfWarnings,
  googleFontSchema,
} from "./validation";

describe("familyNameSchema", () => {
  it("accepts letters/numbers/spaces/hyphens", () => {
    expect(familyNameSchema.safeParse("Inter").success).toBe(true);
    expect(familyNameSchema.safeParse("My Brand 2").success).toBe(true);
  });
  it("rejects CSS-breaking characters", () => {
    expect(familyNameSchema.safeParse('Inter"; }').success).toBe(false);
    expect(familyNameSchema.safeParse("<script>").success).toBe(false);
    expect(familyNameSchema.safeParse("").success).toBe(false);
  });
});

describe("createFamilySchema", () => {
  it("requires at least one face", () => {
    expect(createFamilySchema.safeParse({ name: "Inter", faces: [] }).success).toBe(false);
  });
  it("accepts a valid family", () => {
    const r = createFamilySchema.safeParse({
      name: "Inter",
      faces: [{ mediaId: "m1", weight: 400, style: "normal" }],
    });
    expect(r.success).toBe(true);
  });
  it("rejects an out-of-range weight", () => {
    expect(
      createFamilySchema.safeParse({ name: "Inter", faces: [{ mediaId: "m1", weight: 5000, style: "normal" }] }).success,
    ).toBe(false);
  });
});

describe("googleFontSchema", () => {
  it("requires at least one variant", () => {
    expect(googleFontSchema.safeParse({ family: "Inter", variants: [] }).success).toBe(false);
  });
  it("accepts weight+style variants", () => {
    expect(
      googleFontSchema.safeParse({ family: "Inter", variants: [{ weight: 700, style: "italic" }] }).success,
    ).toBe(true);
  });
});

describe("fontPerfWarnings", () => {
  it("is quiet for a lean setup", () => {
    const w = fontPerfWarnings({ familyCount: 1, faces: [{ ext: "woff2", sizeBytes: 40_000 }] });
    expect(w).toEqual([]);
  });

  it("warns on a large total payload", () => {
    const w = fontPerfWarnings({
      familyCount: 1,
      faces: [{ ext: "woff2", sizeBytes: 400 * 1024 }],
    });
    expect(w.some((x) => x.code === "payload")).toBe(true);
  });

  it("warns on too many families", () => {
    const w = fontPerfWarnings({ familyCount: 3, faces: [{ ext: "woff2", sizeBytes: 1000 }] });
    expect(w.some((x) => x.code === "families")).toBe(true);
  });

  it("flags non-woff2 files", () => {
    const w = fontPerfWarnings({ familyCount: 1, faces: [{ ext: "ttf", sizeBytes: 1000 }] });
    expect(w.some((x) => x.code === "non-woff2")).toBe(true);
  });

  it("flags too many faces", () => {
    const faces = Array.from({ length: 8 }, () => ({ ext: "woff2", sizeBytes: 1000 }));
    const w = fontPerfWarnings({ familyCount: 1, faces });
    expect(w.some((x) => x.code === "faces")).toBe(true);
  });
});
