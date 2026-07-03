import { z } from "zod";

/**
 * Shared, reusable style fragment carried optionally on every block. Values are
 * TOKEN-REFERENCING ENUMS, never raw px/color — so a user (or a white-label instance)
 * can restyle any block without escaping the design system or breaking responsiveness.
 * BlockShell (core/BlockShell.tsx) is the single place these enums map to CSS tokens.
 *
 * MOBILE-FIRST: the flat base object below describes the mobile / all-sizes rendering. The
 * optional `tablet` and `desktop` partials layer overrides on top as the block's CONTAINER
 * grows (min-width container queries, emitted by BlockShell). A block with no tablet/desktop
 * keys renders identically at every width — which is exactly how every legacy block (a flat
 * style object) already behaves, so nothing regresses and no migration is needed.
 *
 * Every field is optional; an absent value means "the block's built-in default", which is
 * today's hardcoded behavior — so existing content renders identically until an author opts
 * into a style.
 *
 * This module is PURE DATA (no React, no "use client"): the token-map lookups live here next
 * to the enums so the server BlockShell and the client StylePanel both import them without
 * either dragging the other's code across the server/client bundle boundary.
 */

// ---------------------------------------------------------------------------
// Enum option lists (exported so the StylePanel can build its controls from the
// single source of truth rather than re-declaring option arrays).
// ---------------------------------------------------------------------------

/** Named steps over the NON-CONTIGUOUS --space-* scale (no 7/9/11). Never a numeric range —
 * mapping goes through SPACE_STEP below so we never emit a var(--space-7) that doesn't exist. */
export const SPACE_STEPS = ["none", "1", "2", "3", "4", "5", "6", "8", "10", "12"] as const;
export const ALIGNS = ["left", "center", "right"] as const;
export const WIDTHS = ["prose", "content", "full-bleed"] as const;
export const PADDINGS = ["none", "sm", "md", "lg"] as const;
export const ACCENTS = ["default", "accent-2"] as const;
export const THEMES = ["inherit", "light", "dark", "invert"] as const;
export const FONT_SIZES = ["display", "h1", "h2", "lg", "body", "sm", "xs", "2xs"] as const;
export const FONT_WEIGHTS = ["regular", "medium", "semibold", "bold"] as const;
export const LEADINGS = ["tight", "snug", "normal", "relaxed"] as const;
export const TRACKINGS = ["tight", "normal", "wide", "widest"] as const;
export const FONTS = ["sans", "mono", "display", "heading", "body", "label"] as const;
export const TEXT_COLORS = ["default", "muted", "faint", "on-accent", "accent", "accent-2"] as const;
export const BACKGROUNDS = ["none", "surface", "card", "tint", "accent", "accent-2"] as const;
export const BORDER_WIDTHS = ["none", "hairline", "thick"] as const;
export const BORDER_STYLES = ["solid", "dashed", "dotted"] as const;
export const BORDER_COLORS = ["border", "border-strong", "accent", "accent-2"] as const;
export const RADII = ["none", "xs", "sm", "md", "pill"] as const;
export const SHADOWS = ["none", "sm", "md", "lg"] as const;

/** The universal style fields available on EVERY block (the mobile / base layer). Shared by the
 * responsive partials below. All values are token-referencing enums (or a boolean for
 * visibility); none accepts raw px/hex. */
const baseStyleSchema = z
  .object({
    // — Layout —
    /** Text alignment of the block's content. */
    align: z.enum(ALIGNS),
    /** Horizontal sizing: constrained to prose/content width, or edge-to-edge. */
    width: z.enum(WIDTHS),
    /** Column count for multi-item blocks (gallery, metric). Replaces hardcoded grid counts. */
    columns: z.number().int().min(1).max(6),

    // — Spacing —
    /** Legacy vertical padding shorthand (kept for backward-compat with existing content). */
    padding: z.enum(PADDINGS),
    /** Per-side padding over the --space-* scale. When set, wins over `padding` for that side. */
    padTop: z.enum(SPACE_STEPS),
    padRight: z.enum(SPACE_STEPS),
    padBottom: z.enum(SPACE_STEPS),
    padLeft: z.enum(SPACE_STEPS),

    // — Typography —
    fontSize: z.enum(FONT_SIZES),
    fontWeight: z.enum(FONT_WEIGHTS),
    leading: z.enum(LEADINGS),
    tracking: z.enum(TRACKINGS),
    font: z.enum(FONTS),

    // — Color —
    /** Text color, from the semantic ink/accent tokens. */
    color: z.enum(TEXT_COLORS),
    /** Background fill, from the semantic surface/accent tokens. */
    background: z.enum(BACKGROUNDS),

    // — Border & effects —
    borderWidth: z.enum(BORDER_WIDTHS),
    borderStyle: z.enum(BORDER_STYLES),
    borderColor: z.enum(BORDER_COLORS),
    radius: z.enum(RADII),
    shadow: z.enum(SHADOWS),

    // — Accent / theme (subtree-scoped, not per-breakpoint-meaningful but allowed everywhere) —
    /** Swap the local accent to the secondary accent for this block's subtree. */
    accent: z.enum(ACCENTS),
    /** Force a theme locally (e.g. a dark section on a light page). */
    theme: z.enum(THEMES),

    // — Visibility —
    /** false = hidden (display:none) at this breakpoint; used for responsive show/hide. */
    visible: z.boolean(),
  })
  .partial();

/** The base (mobile / all-sizes) style fields, without the responsive override partials. */
export type BaseStyleProps = z.infer<typeof baseStyleSchema>;

/**
 * The full style object persisted on a block: the flat base (mobile) plus optional `tablet` and
 * `desktop` OVERRIDE partials that scale up from it. Legacy flat objects (no tablet/desktop
 * keys) are valid unchanged and apply at all widths.
 */
export const styleSchema = baseStyleSchema.extend({
  /** Overrides applied at >= tablet container width. */
  tablet: baseStyleSchema.optional(),
  /** Overrides applied at >= desktop container width. */
  desktop: baseStyleSchema.optional(),
});

export type StyleProps = z.infer<typeof styleSchema>;

/** Which style controls a given block opts into. INVERTED DEFAULT (see defineBlock/StylePanel):
 * an ABSENT styleCaps means the FULL universal set is available; a present styleCaps is a
 * NARROWING allow-list (e.g. a spacer exposes only spacing/visibility). `columns` is the one
 * field that stays opt-IN (off unless a grid block enables it). Caps gate the editor UI only —
 * never validation or rendering — so hand-authored JSON is never dropped by a cap change. */
export type StyleCapabilities = Partial<Record<keyof BaseStyleProps, boolean>>;

// ---------------------------------------------------------------------------
// Token-map lookups. Each maps an enum member → the CSS value BlockShell emits.
// Kept next to the schema so an enum and its token mapping can never drift.
// ---------------------------------------------------------------------------

/** --space-* index for each legacy `padding` token. */
export const PADDING_SPACE: Record<NonNullable<BaseStyleProps["padding"]>, number> = {
  none: 0,
  sm: 3,
  md: 6,
  lg: 10,
};

/** Named space step → CSS length. "none" is 0; every other step is an existing --space-* var,
 * so we never synthesize a nonexistent token. */
export const SPACE_STEP: Record<(typeof SPACE_STEPS)[number], string> = {
  none: "0",
  "1": "var(--space-1)",
  "2": "var(--space-2)",
  "3": "var(--space-3)",
  "4": "var(--space-4)",
  "5": "var(--space-5)",
  "6": "var(--space-6)",
  "8": "var(--space-8)",
  "10": "var(--space-10)",
  "12": "var(--space-12)",
};

export const FONT_SIZE_VAR: Record<(typeof FONT_SIZES)[number], string> = {
  display: "var(--text-display)",
  h1: "var(--text-h1)",
  h2: "var(--text-h2)",
  lg: "var(--text-lg)",
  body: "var(--text-body)",
  sm: "var(--text-sm)",
  xs: "var(--text-xs)",
  "2xs": "var(--text-2xs)",
};

/** Weight is a plain CSS numeric (not a brand-themeable color/size), so mapping to standard
 * weight values stays within the tokens-only spirit — no raw px, no hex. */
export const FONT_WEIGHT_VALUE: Record<(typeof FONT_WEIGHTS)[number], string> = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

export const LEADING_VAR: Record<(typeof LEADINGS)[number], string> = {
  tight: "var(--leading-tight)",
  snug: "var(--leading-snug)",
  normal: "var(--leading-normal)",
  relaxed: "var(--leading-relaxed)",
};

export const TRACKING_VAR: Record<(typeof TRACKINGS)[number], string> = {
  tight: "var(--tracking-tight)",
  normal: "var(--tracking-normal)",
  wide: "var(--tracking-wide)",
  widest: "var(--tracking-widest)",
};

export const FONT_VAR: Record<(typeof FONTS)[number], string> = {
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
  display: "var(--font-display)",
  heading: "var(--font-heading)",
  body: "var(--font-body)",
  label: "var(--font-label)",
};

export const TEXT_COLOR_VAR: Record<(typeof TEXT_COLORS)[number], string> = {
  default: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",
  "on-accent": "var(--text-on-accent)",
  accent: "var(--accent)",
  "accent-2": "var(--accent-2)",
};

export const BACKGROUND_VAR: Record<(typeof BACKGROUNDS)[number], string> = {
  none: "transparent",
  surface: "var(--surface)",
  card: "var(--surface-card)",
  tint: "var(--accent-tint)",
  accent: "var(--accent)",
  "accent-2": "var(--accent-2)",
};

export const BORDER_WIDTH_VALUE: Record<(typeof BORDER_WIDTHS)[number], string> = {
  none: "0",
  hairline: "var(--border-width)",
  thick: "2px",
};

export const BORDER_COLOR_VAR: Record<(typeof BORDER_COLORS)[number], string> = {
  border: "var(--border)",
  "border-strong": "var(--border-strong)",
  accent: "var(--accent)",
  "accent-2": "var(--accent-2)",
};

export const RADIUS_VAR: Record<(typeof RADII)[number], string> = {
  none: "0",
  xs: "var(--radius-xs)",
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  pill: "var(--radius-pill)",
};

export const SHADOW_VAR: Record<(typeof SHADOWS)[number], string> = {
  none: "var(--shadow-none)",
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
};

/** Container-query min-width thresholds (mobile-first). Base = no query; tablet/desktop layer
 * on top as the block's inline-size container grows. Ordered narrow→wide so later (wider) rules
 * win in source order — the mobile-first cascade. */
export const BREAKPOINT_MINWIDTH = {
  tablet: "48rem",
  desktop: "64rem",
} as const;

// ---------------------------------------------------------------------------
// styleCaps resolution (INVERTED DEFAULT) + panel field grouping.
// Pure data so the client StylePanel imports it without pulling server code.
// ---------------------------------------------------------------------------

/** Every universal field a block exposes by DEFAULT (i.e. when it declares no styleCaps).
 * `columns` is intentionally EXCLUDED — it's opt-in, meaningful only for multi-item/grid blocks
 * that explicitly enable it via styleCaps. */
export const UNIVERSAL_CAPS: (keyof BaseStyleProps)[] = [
  "align", "width",
  "padding", "padTop", "padRight", "padBottom", "padLeft",
  "fontSize", "fontWeight", "leading", "tracking", "font",
  "color", "background",
  "borderWidth", "borderStyle", "borderColor", "radius", "shadow",
  "accent", "theme",
  "visible",
];

/** Fields that are OFF by default and only appear when a spec's styleCaps enables them. */
export const OPTIONAL_CAPS: (keyof BaseStyleProps)[] = ["columns"];

/**
 * Resolve which style controls a block's editor should show, from its (optional) styleCaps.
 * - No styleCaps                ⇒ full universal set (all UNIVERSAL_CAPS on; OPTIONAL_CAPS off).
 * - styleCaps present           ⇒ a NARROWING allow-list: a universal field shows unless its cap
 *                                 is explicitly `false`; an optional field (columns) shows only if
 *                                 its cap is explicitly `true`.
 * Caps gate the editor UI ONLY — never validation/rendering — so stored style is never dropped.
 */
export function resolveCaps(caps?: StyleCapabilities): Set<keyof BaseStyleProps> {
  const out = new Set<keyof BaseStyleProps>();
  if (!caps) {
    for (const k of UNIVERSAL_CAPS) out.add(k);
    return out;
  }
  for (const k of UNIVERSAL_CAPS) if (caps[k] !== false) out.add(k);
  for (const k of OPTIONAL_CAPS) if (caps[k] === true) out.add(k);
  return out;
}

/** A single control in the panel: which style field it edits and how to render it. `space`
 * controls reuse SPACE_STEPS; `enum` controls list their options; `bool` is a visibility toggle;
 * `columns` is a small numeric stepper. */
export type StyleControl =
  | { field: keyof BaseStyleProps; label: string; kind: "enum"; options: readonly string[] }
  | { field: keyof BaseStyleProps; label: string; kind: "space" }
  | { field: keyof BaseStyleProps; label: string; kind: "columns" }
  | { field: keyof BaseStyleProps; label: string; kind: "bool" };

/** Panel groups (Webflow/Framer-style, simpler). Order = display order. Each control names the
 * base field it edits; the panel routes writes to base or the active breakpoint partial. */
export const STYLE_GROUPS: { title: string; controls: StyleControl[] }[] = [
  {
    title: "Layout",
    controls: [
      { field: "align", label: "Align", kind: "enum", options: ALIGNS },
      { field: "width", label: "Width", kind: "enum", options: WIDTHS },
      { field: "columns", label: "Columns", kind: "columns" },
    ],
  },
  {
    title: "Spacing",
    controls: [
      { field: "padTop", label: "Pad top", kind: "space" },
      { field: "padRight", label: "Pad right", kind: "space" },
      { field: "padBottom", label: "Pad bottom", kind: "space" },
      { field: "padLeft", label: "Pad left", kind: "space" },
    ],
  },
  {
    title: "Typography",
    controls: [
      { field: "font", label: "Font", kind: "enum", options: FONTS },
      { field: "fontSize", label: "Size", kind: "enum", options: FONT_SIZES },
      { field: "fontWeight", label: "Weight", kind: "enum", options: FONT_WEIGHTS },
      { field: "leading", label: "Line height", kind: "enum", options: LEADINGS },
      { field: "tracking", label: "Tracking", kind: "enum", options: TRACKINGS },
    ],
  },
  {
    title: "Color",
    controls: [
      { field: "color", label: "Text", kind: "enum", options: TEXT_COLORS },
      { field: "background", label: "Background", kind: "enum", options: BACKGROUNDS },
      { field: "accent", label: "Accent", kind: "enum", options: ACCENTS },
      { field: "theme", label: "Theme", kind: "enum", options: THEMES },
    ],
  },
  {
    title: "Border & effects",
    controls: [
      { field: "borderWidth", label: "Border width", kind: "enum", options: BORDER_WIDTHS },
      { field: "borderStyle", label: "Border style", kind: "enum", options: BORDER_STYLES },
      { field: "borderColor", label: "Border color", kind: "enum", options: BORDER_COLORS },
      { field: "radius", label: "Radius", kind: "enum", options: RADII },
      { field: "shadow", label: "Shadow", kind: "enum", options: SHADOWS },
    ],
  },
  {
    title: "Visibility",
    controls: [{ field: "visible", label: "Visible", kind: "bool" }],
  },
];

/** The three responsive layers the panel edits. "base" is mobile / all-sizes; the others are
 * override partials that scale up. */
export const BREAKPOINTS = [
  { id: "base", label: "Mobile" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
] as const;
export type BreakpointId = (typeof BREAKPOINTS)[number]["id"];
