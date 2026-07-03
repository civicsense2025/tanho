import { darken, lighten, luminance, mix, readableOn } from "./color-math";

/**
 * Semantic token derivation — port of the design system's Brand screen.
 * Four base colors in, a full light or dark token set out. Every block
 * and screen reads only these semantic tokens, which is what makes the
 * whole platform re-brandable from ~12 stored scalars.
 */

export type ThemeBases = {
  accent: string;
  accent2: string;
  ink: string;
  paper: string;
};

export type SemanticTokens = {
  bg: string;
  surface: string;
  surfaceHover: string;
  surfaceCard: string;
  text: string;
  textMuted: string;
  textFaint: string;
  textOnAccent: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentHover: string;
  accentTint: string;
  accent2: string;
  accent2Hover: string;
  accent2Tint: string;
  solid: string;
  solidHover: string;
};

const DARK_INK = "#f0ede4";
const DARK_PAPER = "#14130f";

export function deriveTokens(bases: ThemeBases, mode: "light" | "dark"): SemanticTokens {
  const { accent, accent2, ink, paper } = bases;

  if (mode === "dark") {
    const dAccent = luminance(accent) < 0.4 ? lighten(accent, 0.42) : accent;
    const dAccent2 = luminance(accent2) < 0.4 ? lighten(accent2, 0.42) : accent2;
    return {
      bg: DARK_PAPER,
      surface: "#1c1a15",
      surfaceHover: "#25221b",
      surfaceCard: "#1c1a15",
      text: DARK_INK,
      textMuted: "#a8a294",
      textFaint: "#75705f",
      textOnAccent: readableOn(dAccent, DARK_PAPER, DARK_INK),
      border: "#2c2920",
      borderStrong: "#3a362b",
      accent: dAccent,
      accentHover: lighten(dAccent, 0.16),
      accentTint: mix(DARK_PAPER, dAccent, 0.22),
      accent2: dAccent2,
      accent2Hover: lighten(dAccent2, 0.16),
      accent2Tint: mix(DARK_PAPER, dAccent2, 0.22),
      solid: DARK_INK,
      solidHover: "#ffffff",
    };
  }

  return {
    bg: paper,
    surface: mix(paper, ink, 0.05),
    surfaceHover: mix(paper, ink, 0.09),
    surfaceCard: luminance(paper) > 0.55 ? "#ffffff" : lighten(paper, 0.06),
    text: ink,
    textMuted: mix(ink, paper, 0.32),
    textFaint: mix(ink, paper, 0.5),
    textOnAccent: readableOn(accent, lighten(paper, 0.5), ink),
    border: mix(paper, ink, 0.12),
    borderStrong: mix(paper, ink, 0.2),
    accent,
    accentHover: darken(accent, 0.18),
    accentTint: mix(paper, accent, 0.12),
    accent2,
    accent2Hover: darken(accent2, 0.18),
    accent2Tint: mix(paper, accent2, 0.12),
    solid: ink,
    solidHover: darken(ink, 0.4),
  };
}
