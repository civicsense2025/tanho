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

/** One responsive layer's worth of style — all optional, inner-box only. */
export const styleLayerSchema = z
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
  })
  .partial();

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
