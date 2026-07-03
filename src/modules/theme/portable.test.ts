import { describe, expect, it } from "vitest";
import { exportThemeJson, importThemeJson, THEME_FORMAT } from "./portable";
import { THEME_DEFAULTS } from "./validation";

describe("theme portable format", () => {
  it("round-trips export → import", () => {
    const exported = exportThemeJson("My theme", THEME_DEFAULTS, 1_700_000_000_000);
    expect(exported.format).toBe(THEME_FORMAT);
    const imported = importThemeJson(exported);
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.name).toBe("My theme");
      expect(imported.theme).toEqual(THEME_DEFAULTS);
    }
  });

  it("rejects a wrong/absent format tag", () => {
    const r = importThemeJson({ name: "x", theme: THEME_DEFAULTS });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid theme values", () => {
    const r = importThemeJson({ format: THEME_FORMAT, name: "bad", theme: { ...THEME_DEFAULTS, accent: "not-a-hex" } });
    expect(r.ok).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(importThemeJson(null).ok).toBe(false);
    expect(importThemeJson("nope").ok).toBe(false);
  });

  it("falls back to a default name when missing", () => {
    const r = importThemeJson({ format: THEME_FORMAT, theme: THEME_DEFAULTS });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.name).toBe("Imported theme");
  });
});
