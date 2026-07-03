import { describe, expect, it } from "vitest";
import { contrast, hexToRgb, hslToHex, mix, rgbToHex } from "./color-math";
import { deriveTokens } from "./derive";
import { buildThemeCss } from "./ThemeStyle";
import { THEME_DEFAULTS } from "./validation";

const BASES = {
  accent: "#6e2b32",
  accent2: "#585c34",
  ink: "#1c1a16",
  paper: "#fdfcf9",
};

describe("color math", () => {
  it("round-trips hex", () => {
    expect(rgbToHex(hexToRgb("#6e2b32"))).toBe("#6e2b32");
    expect(rgbToHex(hexToRgb("#abc"))).toBe("#aabbcc");
  });
  it("mixes toward white and black", () => {
    expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mix("#000000", "#ffffff", 0)).toBe("#000000");
  });
  it("converts hsl", () => {
    expect(hslToHex(0, 0, 100)).toBe("#ffffff");
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
  });
});

describe("deriveTokens", () => {
  const light = deriveTokens(BASES, "light");
  const dark = deriveTokens(BASES, "dark");

  it("keeps base colors in the light set", () => {
    expect(light.bg).toBe(BASES.paper);
    expect(light.text).toBe(BASES.ink);
    expect(light.accent).toBe(BASES.accent);
  });

  it("lightens dark-mode accents that are too dark", () => {
    expect(dark.accent).not.toBe(BASES.accent);
    expect(contrast(dark.accent, dark.bg)).toBeGreaterThan(
      contrast(BASES.accent, dark.bg),
    );
  });

  // WCAG floor for the default palette — the pairs the Brand screen checks.
  it.each([
    ["body text on background", () => [light.text, light.bg]] as const,
    ["text on card", () => [light.text, light.surfaceCard]] as const,
    ["button label on accent", () => [light.textOnAccent, light.accent]] as const,
    ["dark body text on background", () => [dark.text, dark.bg]] as const,
    ["dark label on accent", () => [dark.textOnAccent, dark.accent]] as const,
  ])("%s meets WCAG AA (4.5:1)", (_label, pair) => {
    const [fg, bg] = pair();
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("muted text still meets AA large (3:1)", () => {
    expect(contrast(light.textMuted, light.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(dark.textMuted, dark.bg)).toBeGreaterThanOrEqual(3);
  });
});

describe("buildThemeCss", () => {
  it("emits root, explicit dark, and auto dark scopes", () => {
    const css = buildThemeCss(THEME_DEFAULTS);
    expect(css).toContain(":root{");
    expect(css).toContain('[data-theme="dark"]{');
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("--accent:#6e2b32");
    expect(css).toContain("--font-sans:var(--font-geist-sans)");
  });

  it("never emits an unsafe value", () => {
    const css = buildThemeCss(THEME_DEFAULTS);
    expect(css).not.toContain("</style>");
    expect(css).not.toContain("javascript:");
    expect(css).not.toContain("url(");
  });
});
