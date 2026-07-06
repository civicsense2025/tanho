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

/**
 * Fluid-scaling floor + viewport range for HEADING_KEYS: headings continuously
 * scale down between MIN_VW and MAX_VW, rather than jumping at a breakpoint —
 * the auto-scale default a mobile-first editor promises before an author sets
 * any manual per-breakpoint override (which, once set, wins — the block's
 * inline/scoped style rule is more specific than this root-level token).
 * MAX_VW/MIN_VW mirror BP_DESKTOP and the editor's mobile canvas width
 * (DeviceToggle.tsx) so the curve matches the rest of the responsive system.
 */
const HEADING_MIN_RATIO = 0.82;
const FLUID_MIN_VW = 390;
const FLUID_MAX_VW = 1024;

/**
 * CSS root font-size (`typography.css`'s "16px base" — the fixed rem anchor
 * this codebase assumes; nothing overrides `:root`'s font-size). Needed here
 * because a CSS `Nvw` unit is always resolved in PX (`1vw` = 1% of viewport
 * width in px), so converting a rem-space interpolation into a `rem + Nvw`
 * expression requires converting through px, not just scaling ratios — unlike
 * the ratio-based endpoints (HEADING_MIN_RATIO), the vw coefficient is NOT
 * unit-invariant and depends on this constant.
 */
const CSS_ROOT_PX = 16;

/**
 * `clamp(min, preferred, max)` for a heading size that scales fluidly between
 * FLUID_MIN_VW and FLUID_MAX_VW, landing exactly on `maxRem` at FLUID_MAX_VW
 * and `maxRem * HEADING_MIN_RATIO` at FLUID_MIN_VW. All inputs are already
 * clamped/derived numbers (never free-form strings), so the arithmetic itself
 * is the safety boundary — the only new character this introduces into the
 * emitted CSS is `+`, allow-listed in css-vars.ts's SAFE_VALUE_RE.
 *
 * Derivation (linear interpolation done in PX, then converted back to rem/vw
 * for the CSS string — mixing rem and vw units directly, without going
 * through px, silently produces a preferred value off by CSS_ROOT_PX):
 *   minPx, maxPx = the two endpoints in px
 *   slopePxPerVwPx = (maxPx - minPx) / (FLUID_MAX_VW - FLUID_MIN_VW)  — px of
 *     size increase per 1px of viewport width
 *   interceptPx = minPx - slopePxPerVwPx * FLUID_MIN_VW               — value
 *     the line would take at a (hypothetical) 0px viewport
 *   vwCoefficient = slopePxPerVwPx * 100   — a CSS `1vw` unit IS 1% of the
 *     viewport width in px, so scaling by 100 converts "per 1px of viewport"
 *     into "per 1vw unit"
 *   interceptRem = interceptPx / CSS_ROOT_PX — convert the intercept back to
 *     rem so it can be summed with the `Nvw` term in the clamp() string
 */
function fluidHeadingSize(maxRem: number): string {
  const minRem = +(maxRem * HEADING_MIN_RATIO).toFixed(3);
  const minPx = minRem * CSS_ROOT_PX;
  const maxPx = maxRem * CSS_ROOT_PX;
  const slopePxPerVwPx = (maxPx - minPx) / (FLUID_MAX_VW - FLUID_MIN_VW);
  const interceptPx = minPx - slopePxPerVwPx * FLUID_MIN_VW;
  const vwCoefficient = +(slopePxPerVwPx * 100).toFixed(3);
  const interceptRem = +(interceptPx / CSS_ROOT_PX).toFixed(3);
  return `clamp(${minRem}rem, ${interceptRem}rem + ${vwCoefficient}vw, ${maxRem}rem)`;
}

export type TypeScaleInput = {
  font: FontId;
  baseSize: number; // px, 14–20
  headingScale: number; // ×, 0.85–1.5
  leading: number; // 1.3–2
  /**
   * A pre-validated custom `font-family` stack (from a custom/Google family's
   * cssStack via fonts/css.ts). When set, it overrides the `font` preset for
   * `--font-sans`. Already safe — built server-side from a quoted family name.
   */
  customStack?: string | null;
};

export function typeVars(t: TypeScaleInput): Record<string, string> {
  const bs = t.baseSize / 16;
  const out: Record<string, string> = {
    "--font-sans": t.customStack ?? FONT_STACKS[t.font],
  };
  for (const [k, rem] of Object.entries(TYPE_SIZES)) {
    const isHeading = HEADING_KEYS.has(k);
    const mul = isHeading ? t.headingScale : 1;
    const maxRem = +(rem * bs * mul).toFixed(3);
    // Headings fluid-scale by default (auto-scale without a manual per-breakpoint
    // override); body/label sizes stay flat — the desktop MAX is unchanged from
    // before, so this is a mobile/tablet-only visual change.
    out[`--text-${k}`] = isHeading ? fluidHeadingSize(maxRem) : `${maxRem}rem`;
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
