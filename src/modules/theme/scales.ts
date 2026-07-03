/**
 * Typography + spacing scale derivation — port of the Brand screen's
 * typeVars/spaceVars. All outputs come from these fixed tables and
 * clamped numeric inputs, never from free-form strings.
 */

export const FONT_STACKS = {
  geist: 'var(--font-geist-sans), system-ui, sans-serif',
  system: "system-ui, -apple-system, sans-serif",
  serif: 'Georgia, "Times New Roman", serif',
  grotesk: '"Helvetica Neue", Arial, sans-serif',
  humanist: 'Optima, Candara, "Segoe UI", sans-serif',
} as const;
export type FontId = keyof typeof FONT_STACKS;

/** rem sizes at 16px base; display/h1/h2 scale with the heading multiplier. */
const TYPE_SIZES: Record<string, number> = {
  display: 2.25,
  h1: 1.875,
  h2: 1.25,
  lg: 1.125,
  body: 1,
  sm: 0.875,
  xs: 0.75,
  "2xs": 0.625,
};
const HEADING_KEYS = new Set(["display", "h1", "h2"]);

export type TypeScaleInput = {
  font: FontId;
  baseSize: number; // px, 14–20
  headingScale: number; // ×, 0.85–1.5
  leading: number; // 1.3–2
};

export function typeVars(t: TypeScaleInput): Record<string, string> {
  const bs = t.baseSize / 16;
  const out: Record<string, string> = { "--font-sans": FONT_STACKS[t.font] };
  for (const [k, rem] of Object.entries(TYPE_SIZES)) {
    const mul = HEADING_KEYS.has(k) ? t.headingScale : 1;
    out[`--text-${k}`] = `${+(rem * bs * mul).toFixed(3)}rem`;
  }
  out["--leading-normal"] = String(t.leading);
  out["--leading-relaxed"] = String(+(t.leading + 0.2).toFixed(2));
  return out;
}

const SPACES: Record<string, number> = {
  1: 0.25, 2: 0.5, 3: 0.75, 4: 1, 5: 1.5, 6: 2, 8: 3, 10: 5, 12: 6,
};

export const RADII = {
  square: { xs: "1px", sm: "2px", md: "4px" },
  soft: { xs: "3px", sm: "4px", md: "8px" },
  round: { xs: "6px", sm: "10px", md: "16px" },
} as const;
export type RadiusId = keyof typeof RADII;

export const SHADOWS = {
  flat: {
    sm: "none",
    md: "none",
    lg: "0 1px 2px rgba(28,26,22,.05)",
  },
  subtle: {
    sm: "0 1px 2px rgba(28,26,22,.04)",
    md: "0 4px 16px rgba(28,26,22,.06)",
    lg: "0 12px 40px rgba(28,26,22,.10)",
  },
  elevated: {
    sm: "0 2px 6px rgba(28,26,22,.08)",
    md: "0 8px 24px rgba(28,26,22,.12)",
    lg: "0 20px 60px rgba(28,26,22,.18)",
  },
} as const;
export type ShadowId = keyof typeof SHADOWS;

export type SpaceScaleInput = {
  density: number; // ×, 0.8–1.3
  radius: RadiusId;
  shadow: ShadowId;
};

export function spaceVars(s: SpaceScaleInput): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, rem] of Object.entries(SPACES)) {
    out[`--space-${k}`] = `${+(rem * s.density).toFixed(3)}rem`;
  }
  const r = RADII[s.radius];
  out["--radius-xs"] = r.xs;
  out["--radius-sm"] = r.sm;
  out["--radius-md"] = r.md;
  const sh = SHADOWS[s.shadow];
  out["--shadow-sm"] = sh.sm;
  out["--shadow-md"] = sh.md;
  out["--shadow-lg"] = sh.lg;
  return out;
}
