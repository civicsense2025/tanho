import { z } from "zod";

/** Fields every block content shape carries. */
export const commonContent = {
  /** Hide this block on specific devices (responsive visibility). */
  hideOn: z.array(z.enum(["desktop", "tablet", "mobile"])).optional(),
} as const;

// ───────────────────────────────────────────────────────────────────────────
// Shared, opt-in style layer (tokens-only, mobile-first).
//
// A block gains universal spacing/typography/colour/border controls by spreading
// `...styleContent` into its `z.object({...})` (exactly like `...commonContent`).
// Opt-in is MANDATORY: block schemas are plain z.object (zod default = STRIP), so
// `def.schema.safeParse` in BlockRenderer drops `style` on any block that hasn't
// spread this fragment — which is why absent-style blocks render identically.
//
// Values are TOKEN-REFERENCING ENUMS ONLY — never raw px/hex, and never the raw
// --maroon-*/--olive-* primitives. Per docs/architecture/theming.md, blocks may
// only reference SEMANTIC variables; the maps below enforce that at the one point
// enums become CSS (styleToCss, in blocks/renderer/BlockRenderer via style.ts).
//
// Layout primitives (section/row/columns/container/gallery/spacer/divider) do NOT
// opt in — they own the gutter/full-bleed/maxWidth math and a universal wrapper
// would break full-bleed. This layer is inner-box only (padding/type/colour/
// border/radius/shadow/align) — never margin or maxWidth.
// ───────────────────────────────────────────────────────────────────────────

/** Named steps over the NON-CONTIGUOUS --space-* scale (no 7/9/11). Mapping goes
 * through SPACE_STEP so we never synthesize a var(--space-7) that doesn't exist. */
export const SPACE_STEPS = ["0", "1", "2", "3", "4", "5", "6", "8", "10", "12"] as const;
export const FONT_SIZES = ["display", "h1", "h2", "lg", "body", "sm", "xs", "2xs"] as const;
export const FONT_WEIGHTS = ["regular", "medium", "semibold", "bold"] as const;
export const LEADINGS = ["tight", "snug", "normal", "relaxed"] as const;
export const TRACKINGS = ["tight", "normal", "wide", "widest"] as const;
export const FONTS = ["body", "heading", "display", "label", "mono"] as const;
export const TEXT_COLORS = ["default", "muted", "faint", "on-accent", "accent", "accent-2"] as const;
export const BACKGROUNDS = ["none", "surface", "surface-card", "tint", "tint-2", "ink"] as const;
export const BORDER_WIDTHS = ["none", "hairline", "thick"] as const;
export const BORDER_STYLES = ["solid", "dashed", "dotted"] as const;
export const BORDER_COLORS = ["border", "border-strong", "accent", "accent-2"] as const;
export const RADII = ["none", "xs", "sm", "md", "pill"] as const;
export const SHADOWS = ["none", "sm", "md", "lg"] as const;
export const ALIGNS = ["left", "center", "right"] as const;

// Effects layer (Phase 1) — opacity / transform / transition / filter, still
// token-bounded ENUMS (never raw values). Curated preset values may carry literal
// units (px/deg/ms), exactly like BORDER_WIDTH_VALUE.thick="2px" and the numeric
// font weights — the tokens-only invariant is about not letting AUTHORS type raw
// values, not about forbidding units in the fixed maps. These pair with a
// `transition` preset so a hover/state change animates smoothly out of the box.
export const OPACITIES = ["100", "90", "75", "50", "25", "10", "0"] as const;
export const TRANSFORMS = [
  "none",
  "scale-up-sm",
  "scale-up",
  "scale-down",
  "lift",
  "rotate-left",
  "rotate-right",
] as const;
export const TRANSITIONS = ["none", "fast", "base", "slow"] as const;
export const FILTERS = ["none", "blur-sm", "blur", "grayscale", "dim", "brighten"] as const;

// Layout-layer (Phase 2a) enum vocabularies. Kept HERE (the schema owner) so the
// zod enums and the value maps in blocks/renderer/layout-style.ts import from one
// source and can never drift; layout-style.ts holds the enum→CSS maps for each.
export const LAYOUT_DIRECTIONS = ["row", "column", "row-reverse", "column-reverse"] as const;
export const LAYOUT_WRAPS = ["nowrap", "wrap"] as const;
export const LAYOUT_JUSTIFIES = ["start", "center", "end", "between", "around", "evenly"] as const;
export const LAYOUT_ALIGN_ITEMS = ["start", "center", "end", "stretch", "baseline"] as const;
export const LAYOUT_POSITIONS = ["static", "relative", "sticky"] as const;
export const LAYOUT_Z_INDEXES = ["base", "raised", "overlay"] as const;
export const LAYOUT_ORDERS = ["-2", "-1", "0", "1", "2"] as const;
export const LAYOUT_ALIGN_SELVES = ["auto", "start", "center", "end", "stretch"] as const;
export const LAYOUT_BASES = ["auto", "0", "quarter", "third", "half", "full"] as const;
export const LAYOUT_GROWS = ["0", "1"] as const;
export const LAYOUT_SHRINKS = ["0", "1"] as const;
export const LAYOUT_COLS = ["1", "2", "3", "4", "5", "6"] as const;
export const LAYOUT_COL_TEMPLATES = ["1-1", "1-2", "2-1", "1-3", "3-1", "1-1-1", "2-1-1", "1-2-1", "1-1-2", "1-1-1-1"] as const;
export const LAYOUT_MIN_COL_WIDTHS = ["none", "3", "4", "5", "6", "8", "10", "12"] as const;

/** The plain style FIELDS (inner-box, all optional) — no per-state sub-layers.
 * Reused verbatim for the hover/focus/active state layers so a state can carry
 * exactly the same properties as the default, but states can't nest states. */
export const styleFieldsSchema = z
  .object({
    padTop: z.enum(SPACE_STEPS),
    padRight: z.enum(SPACE_STEPS),
    padBottom: z.enum(SPACE_STEPS),
    padLeft: z.enum(SPACE_STEPS),
    fontSize: z.enum(FONT_SIZES),
    fontWeight: z.enum(FONT_WEIGHTS),
    leading: z.enum(LEADINGS),
    tracking: z.enum(TRACKINGS),
    font: z.enum(FONTS),
    textColor: z.enum(TEXT_COLORS),
    background: z.enum(BACKGROUNDS),
    borderWidth: z.enum(BORDER_WIDTHS),
    borderStyle: z.enum(BORDER_STYLES),
    borderColor: z.enum(BORDER_COLORS),
    radius: z.enum(RADII),
    shadow: z.enum(SHADOWS),
    align: z.enum(ALIGNS),
    opacity: z.enum(OPACITIES),
    transform: z.enum(TRANSFORMS),
    transition: z.enum(TRANSITIONS),
    filter: z.enum(FILTERS),
  })
  .partial();

export type StyleFields = z.infer<typeof styleFieldsSchema>;

/** The interaction states a style layer may override (Phase 2). Each carries the
 * SAME fields as the default layer; emitted as `.pb-<id>:hover` / `:focus-visible`
 * / `:active` inside the layer's breakpoint @media, so states ARE responsive. */
export const STYLE_STATES = ["hover", "focus", "active"] as const;
export type StyleState = (typeof STYLE_STATES)[number];

/** One responsive layer's worth of style: the default fields PLUS optional per-state
 * sub-layers (hover/focus/active). `StyleLayer` still carries the default fields
 * directly, so styleDecls(layer) keeps reading them; the states hang off named keys. */
export const styleLayerSchema = styleFieldsSchema.extend({
  hover: styleFieldsSchema.optional(),
  focus: styleFieldsSchema.optional(),
  active: styleFieldsSchema.optional(),
});

export type StyleLayer = z.infer<typeof styleLayerSchema>;

/** The opt-in style fragment: a mobile-first base plus tablet/desktop OVERRIDE
 * partials that scale up (desktop ⊃ tablet ⊃ base). "Unset on a breakpoint" is a
 * MISSING key, never an explicit undefined — see the merge in styleToCss. */
export const styleContent = {
  style: z
    .object({
      base: styleLayerSchema.optional(),
      tablet: styleLayerSchema.optional(),
      desktop: styleLayerSchema.optional(),
    })
    .partial()
    .optional(),
} as const;

export type BlockStyle = z.infer<(typeof styleContent)["style"]>;

/** True when a block type opted into the universal style layer (spread
 * `...styleContent`) — i.e. its schema has a `style` key. Drives whether the
 * Inspector shows the Style section. Robust to the block list changing: derived
 * from the schema, not a hardcoded set. */
export function isStyledBlock(schema: z.ZodType): boolean {
  const shape = (schema as { shape?: Record<string, unknown> }).shape;
  return !!shape && "style" in shape;
}

// ───────────────────────────────────────────────────────────────────────────
// Raw-value "advanced" style bucket (Phase 1) — the SIBLING of the token `style`
// layer, deliberately SEPARATE so the two never mix: `style` is safe-by-construction
// token enums; `advancedStyle` is free-form `property: value` an author types (px/hex/
// any allow-listed property). It is NOT safe by construction, so like `customCss` it is
// load-bearing-sanitised by lib/css-sanitizer.ts `sanitizeAdvancedDecls` on SAVE and
// re-sanitised on RENDER (same ALLOWED_PROPS + isSafeValue gates as customCss — no wider
// value grammar). Keeping it a distinct bucket is the "quarantine": token-mode blocks
// never carry this key, so brand-safety / theme-swap hold for everything that doesn't opt in.
// ───────────────────────────────────────────────────────────────────────────

/** One breakpoint's worth of raw declarations: a free-form property→value map.
 *  Bounded string keys/values at the schema layer; all real safety is the sanitiser. */
export const advancedLayerSchema = z.record(z.string().max(60), z.string().max(300));

export type AdvancedLayer = z.infer<typeof advancedLayerSchema>;

/** The opt-in raw-value fragment (spread alongside `...styleContent`). Mobile-first
 *  base + tablet/desktop OVERRIDE maps, exactly like `style`. */
export const advancedStyleContent = {
  advancedStyle: z
    .object({
      base: advancedLayerSchema.optional(),
      tablet: advancedLayerSchema.optional(),
      desktop: advancedLayerSchema.optional(),
    })
    .partial()
    .optional(),
} as const;

export type BlockAdvancedStyle = z.infer<(typeof advancedStyleContent)["advancedStyle"]>;

/** True when a block opted into the raw-value advanced mode (schema has an
 *  `advancedStyle` key). Drives the "＋ Advanced" sections in the Inspector. */
export function hasAdvancedStyle(schema: z.ZodType): boolean {
  const shape = (schema as { shape?: Record<string, unknown> }).shape;
  return !!shape && "advancedStyle" in shape;
}

// ───────────────────────────────────────────────────────────────────────────
// Motion layer (Phase 3) — an opt-in entrance-animation fragment any block can carry.
// Trigger × effect × timing, all bounded ENUMS. CSS-first: the block ships a
// data-motion-* stamped wrapper + an initial "hidden" state in its scoped <style>;
// the shared client island (blocks/client/enhancements) plays it on load or when it
// scrolls into view (IntersectionObserver). NO-JS FALLBACK: a @media
// (prefers-reduced-motion) guard AND a "no data-blocks-enhanced" guard leave the block
// in its FINAL (visible) state, so content is never hidden without JS. Secure by
// construction — every value maps to a keyword / bounded number / var(--token).
// ───────────────────────────────────────────────────────────────────────────
export const MOTION_TRIGGERS = ["none", "load", "in-view"] as const;
export const MOTION_EFFECTS = [
  "fade",
  "fade-up",
  "fade-down",
  "fade-left",
  "fade-right",
  "scale",
  "blur",
] as const;
export const MOTION_DURATIONS = ["fast", "base", "slow", "slower"] as const;
export const MOTION_DELAYS = ["0", "short", "medium", "long"] as const;
export const MOTION_EASINGS = ["ease", "ease-out", "spring"] as const;

/** The opt-in motion fragment (spread `...motionContent`). All optional; a `trigger`
 *  of "none"/absent means no animation. Not per-breakpoint — an entrance effect is a
 *  single behaviour, tuned once. */
export const motionContent = {
  motion: z
    .object({
      trigger: z.enum(MOTION_TRIGGERS),
      effect: z.enum(MOTION_EFFECTS),
      duration: z.enum(MOTION_DURATIONS),
      delay: z.enum(MOTION_DELAYS),
      easing: z.enum(MOTION_EASINGS),
      /** Stagger children (layout/collection blocks): each direct child's entrance is
       *  offset by this step. Ignored by leaf blocks. */
      stagger: z.enum(MOTION_DELAYS),
    })
    .partial()
    .optional(),
} as const;

export type BlockMotion = z.infer<(typeof motionContent)["motion"]>;

/** True when a block opted into the motion layer (schema has a `motion` key). */
export function hasMotion(schema: z.ZodType): boolean {
  const shape = (schema as { shape?: Record<string, unknown> }).shape;
  return !!shape && "motion" in shape;
}

// Enum → semantic CSS value. Every value is a semantic token var (or "0"/"none"),
// never a raw primitive, px, or hex — the tokens-only invariant, enforced here.
export const SPACE_STEP: Record<(typeof SPACE_STEPS)[number], string> = {
  "0": "0",
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
/** Plain CSS numeric weights — not brand-themeable colour/size, so standard values
 * stay within the tokens-only spirit (no px, no hex). */
export const FONT_WEIGHT_VALUE: Record<(typeof FONT_WEIGHTS)[number], string> = {
  regular: "var(--weight-regular)",
  medium: "var(--weight-medium)",
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
  body: "var(--font-body)",
  heading: "var(--font-heading)",
  display: "var(--font-display)",
  label: "var(--font-label)",
  mono: "var(--font-mono)",
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
  "surface-card": "var(--surface-card)",
  tint: "var(--accent-tint)",
  "tint-2": "var(--accent-2-tint)",
  ink: "var(--solid)",
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

// Effects value maps. Opacity is a bare 0–1 number; transform/filter are curated
// literals (units allowed in the fixed map — see the note by OPACITIES). transition
// maps to a duration+easing pair using the leading-easing tokens where available.
export const OPACITY_VALUE: Record<(typeof OPACITIES)[number], string> = {
  "100": "1",
  "90": "0.9",
  "75": "0.75",
  "50": "0.5",
  "25": "0.25",
  "10": "0.1",
  "0": "0",
};
export const TRANSFORM_VALUE: Record<(typeof TRANSFORMS)[number], string> = {
  none: "none",
  "scale-up-sm": "scale(1.02)",
  "scale-up": "scale(1.05)",
  "scale-down": "scale(0.97)",
  lift: "translateY(-4px)",
  "rotate-left": "rotate(-2deg)",
  "rotate-right": "rotate(2deg)",
};
export const TRANSITION_VALUE: Record<(typeof TRANSITIONS)[number], string> = {
  none: "none",
  fast: "all 120ms ease",
  base: "all 200ms ease",
  slow: "all 400ms ease",
};
export const FILTER_VALUE: Record<(typeof FILTERS)[number], string> = {
  none: "none",
  "blur-sm": "blur(2px)",
  blur: "blur(6px)",
  grayscale: "grayscale(1)",
  dim: "brightness(0.85)",
  brighten: "brightness(1.1)",
};

// ───────────────────────────────────────────────────────────────────────────
// Advanced LAYOUT style layer (Phase 2a) — the SIBLING of styleContent, opted
// into ONLY by the four layout blocks (section/container/row/columns) by spreading
// `...layoutStyleContent`. Where styleContent is inner-box (padding/type/colour),
// this layer owns FLEX/GRID/POSITIONING — the things layout primitives legitimately
// need and which a universal wrapper deliberately withholds.
//
// SECURE BY CONSTRUCTION: every field is a token-enum or a bounded set. The render
// twin (blocks/renderer/layout-style.ts) maps each enum to a CSS keyword, a bounded
// integer (z-index/order), or a var(--token) — NEVER a raw px/hex. Nothing here can
// reach CSS un-mapped, so this layer keeps the tokens-only invariant with no
// sanitiser needed (unlike the customCss escape hatch, which does).
//
// The enum VOCABULARIES live in layout-style.ts (next to their value maps) and are
// imported here so the schema and the maps can never drift apart.
// ───────────────────────────────────────────────────────────────────────────

/** One responsive layer's worth of layout controls — all optional. Mirrors the
 * value maps in blocks/renderer/layout-style.ts one-to-one. */
export const layoutLayerSchema = z
  .object({
    direction: z.enum(LAYOUT_DIRECTIONS),
    wrap: z.enum(LAYOUT_WRAPS),
    justify: z.enum(LAYOUT_JUSTIFIES),
    align: z.enum(LAYOUT_ALIGN_ITEMS),
    gap: z.enum(SPACE_STEPS),
    colGap: z.enum(SPACE_STEPS),
    rowGap: z.enum(SPACE_STEPS),
    position: z.enum(LAYOUT_POSITIONS),
    stickyTop: z.enum(SPACE_STEPS),
    zIndex: z.enum(LAYOUT_Z_INDEXES),
    order: z.enum(LAYOUT_ORDERS),
    alignSelf: z.enum(LAYOUT_ALIGN_SELVES),
    basis: z.enum(LAYOUT_BASES),
    grow: z.enum(LAYOUT_GROWS),
    shrink: z.enum(LAYOUT_SHRINKS),
    cols: z.enum(LAYOUT_COLS),
    colTemplate: z.enum(LAYOUT_COL_TEMPLATES),
    minColWidth: z.enum(LAYOUT_MIN_COL_WIDTHS),
  })
  .partial();

export type LayoutLayer = z.infer<typeof layoutLayerSchema>;

/** The opt-in layout fragment: mobile-first base + tablet/desktop OVERRIDE partials
 * (desktop ⊃ tablet ⊃ base), exactly like `style`. "Unset on a breakpoint" is a
 * MISSING key. Emitted as REAL responsive CSS (per-breakpoint custom properties +
 * @media) by BlockRenderer, since the public page is served on one device branch. */
export const layoutStyleContent = {
  layout: z
    .object({
      base: layoutLayerSchema.optional(),
      tablet: layoutLayerSchema.optional(),
      desktop: layoutLayerSchema.optional(),
    })
    .partial()
    .optional(),
} as const;

export type BlockLayout = z.infer<(typeof layoutStyleContent)["layout"]>;

/** True when a block type opted into the layout layer (spread `...layoutStyleContent`
 * — i.e. its schema has a `layout` key). Drives whether the Inspector shows the
 * Layout group. Derived from the schema, robust to the block list changing. */
export function isLayoutBlock(schema: z.ZodType): boolean {
  const shape = (schema as { shape?: Record<string, unknown> }).shape;
  return !!shape && "layout" in shape;
}

// ───────────────────────────────────────────────────────────────────────────
// Raw-CSS escape hatch (Phase 2b) — a `customCss` field on the four layout blocks.
// UNLIKE every other field on a block, this is FREE-FORM text, so it is the one
// value that is NOT safe by construction. It is load-bearing-sanitised by
// lib/css-sanitizer.ts on SAVE (blocks-io stores only the sanitised string) AND
// re-sanitised on RENDER (BlockRenderer, defence in depth). The raw string is never
// interpolated into a <style>; only the AST-rebuilt, scoped output is.
// ───────────────────────────────────────────────────────────────────────────

/** Generous cap; the sanitiser also enforces a serialized-size budget. */
export const CUSTOM_CSS_MAX = 20000;

/** The opt-in custom-CSS fragment (spread alongside `...layoutStyleContent`). Just
 * a bounded string at the schema layer — all real safety happens in the sanitiser. */
export const customCssContent = {
  customCss: z.string().max(CUSTOM_CSS_MAX).default(""),
} as const;

/** True when a block type opted into the custom-CSS escape hatch. */
export function hasCustomCss(schema: z.ZodType): boolean {
  const shape = (schema as { shape?: Record<string, unknown> }).shape;
  return !!shape && "customCss" in shape;
}

/**
 * Analytics event name fired when a CTA is clicked: ^[a-z0-9_]+$ (matches the
 * /api/track allowlist), or empty for an untracked plain link. Shared by the
 * buttons/pricing/newsletter blocks so their trackEvent field stays consistent.
 */
export const trackEventSchema = z
  .string()
  .max(40)
  .regex(/^[a-z0-9_]*$/, "Lowercase letters, digits and underscores only")
  .default("");

/** A small string-only params bag sent alongside a tracked CTA event. */
export const trackParamsSchema = z
  .record(z.string().max(40), z.string().max(120))
  .default({});

/** Recursive child-block list for nestable layout blocks. */
export type ChildBlocks = Array<{
  id: string;
  type: string;
  content: Record<string, unknown>;
}>;

export const childBlocksSchema: z.ZodType<ChildBlocks> = z.lazy(() =>
  z.array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      content: z.record(z.string(), z.unknown()),
    }),
  ),
);
