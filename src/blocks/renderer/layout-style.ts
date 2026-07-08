import {
  SPACE_STEP,
  RADIUS_VAR,
  LAYOUT_DIRECTIONS,
  LAYOUT_WRAPS,
  LAYOUT_JUSTIFIES,
  LAYOUT_ALIGN_ITEMS,
  LAYOUT_POSITIONS,
  LAYOUT_Z_INDEXES,
  LAYOUT_ORDERS,
  LAYOUT_ALIGN_SELVES,
  LAYOUT_BASES,
  LAYOUT_GROWS,
  LAYOUT_SHRINKS,
  LAYOUT_COLS,
  LAYOUT_COL_TEMPLATES,
  LAYOUT_MIN_COL_WIDTHS,
  type LayoutLayer,
  type BlockLayout,
} from "../common";
import type { Device } from "../types";

/**
 * The render-side twin of the layout-control enum maps in blocks/common.ts — the
 * ONE place a layout block's enums become real CSS. Pure: no React, no async, no
 * mutation. Sibling to renderer/style.ts (the inner-box style layer); this file
 * owns the layout layer (flex/grid/positioning) that ONLY the four layout blocks
 * (section/container/row/columns) opt into.
 *
 * TOKENS-ONLY, BY CONSTRUCTION: every emitted value is either a CSS keyword from a
 * fixed vocabulary (e.g. "row", "center"), a plain bounded integer (z-index/order),
 * or a `var(--token)` semantic reference (gap/sticky offsets/min-column width via
 * SPACE_STEP + MIN_COL_WIDTH). No enum can ever map to a raw px/hex, so nothing
 * user-typed reaches CSS through this layer — same guarantee as style.ts.
 *
 * RESPONSIVE WITHOUT ctx.device: the public page is served with a single hardcoded
 * device branch ("desktop"), so this layer must NOT gate responsiveness on
 * ctx.device. Instead `layoutToVars` emits, per breakpoint, a bag of CSS CUSTOM
 * PROPERTIES (--pbl-*), and BlockRenderer writes them into a <style> scoped to the
 * block's generated class with real @media queries. The wrapper's own declarations
 * (layoutBaseDecls) CONSUME those custom properties, so ONE served page is correct
 * at every viewport width. `resolveLayoutLayer` (used for editor-device previews and
 * tests) collapses the three layers to the one active at a given Device.
 */

// ── Enum → CSS value maps. Every value is a keyword, bounded int, or var(--token).
// The enum VOCABULARIES are imported from common.ts (the schema owner) so the zod
// enums and these maps share one source and can never drift.

/** flex-direction / grid auto-flow driver. Plain CSS keywords. */
const DIRECTION_VALUE: Record<(typeof LAYOUT_DIRECTIONS)[number], string> = {
  row: "row",
  column: "column",
  "row-reverse": "row-reverse",
  "column-reverse": "column-reverse",
};
const WRAP_VALUE: Record<(typeof LAYOUT_WRAPS)[number], string> = {
  nowrap: "nowrap",
  wrap: "wrap",
};
/** justify-content — the fl*ex* alias set expands the shorthand names. */
const JUSTIFY_VALUE: Record<(typeof LAYOUT_JUSTIFIES)[number], string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};
const ALIGN_ITEMS_VALUE: Record<(typeof LAYOUT_ALIGN_ITEMS)[number], string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};
const POSITION_VALUE: Record<(typeof LAYOUT_POSITIONS)[number], string> = {
  static: "static",
  relative: "relative",
  sticky: "sticky",
};
/** Bounded z-index ladder. Plain integers/keyword — never a themeable token, but
 *  safe constants stay within the tokens-only spirit (no px, no hex). */
const Z_INDEX_VALUE: Record<(typeof LAYOUT_Z_INDEXES)[number], string> = {
  base: "auto",
  raised: "10",
  overlay: "40",
};
const ORDER_VALUE: Record<(typeof LAYOUT_ORDERS)[number], string> = {
  "-2": "-2",
  "-1": "-1",
  "0": "0",
  "1": "1",
  "2": "2",
};
const ALIGN_SELF_VALUE: Record<(typeof LAYOUT_ALIGN_SELVES)[number], string> = {
  auto: "auto",
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};
/** flex-basis. Fractions map to percentages; "auto"/"0" are literal. */
const BASIS_VALUE: Record<(typeof LAYOUT_BASES)[number], string> = {
  auto: "auto",
  "0": "0",
  quarter: "25%",
  third: "33.3333%",
  half: "50%",
  full: "100%",
};
const GROW_VALUE: Record<(typeof LAYOUT_GROWS)[number], string> = { "0": "0", "1": "1" };
const SHRINK_VALUE: Record<(typeof LAYOUT_SHRINKS)[number], string> = { "0": "0", "1": "1" };
/** Even-count grid templates: minmax(0, 1fr) so children can shrink below content
 *  size (prevents overflow blowouts) while sharing the track evenly. */
const COLS_TEMPLATE: Record<(typeof LAYOUT_COLS)[number], string> = {
  "1": "minmax(0, 1fr)",
  "2": "repeat(2, minmax(0, 1fr))",
  "3": "repeat(3, minmax(0, 1fr))",
  "4": "repeat(4, minmax(0, 1fr))",
  "5": "repeat(5, minmax(0, 1fr))",
  "6": "repeat(6, minmax(0, 1fr))",
};
/** Curated uneven templates. Each "a-b-c" → that many fr tracks in ratio. Fixed
 *  table, so no arbitrary template string is ever built from user input. */
const COL_TEMPLATE_VALUE: Record<(typeof LAYOUT_COL_TEMPLATES)[number], string> = {
  "1-1": "1fr 1fr",
  "1-2": "1fr 2fr",
  "2-1": "2fr 1fr",
  "1-3": "1fr 3fr",
  "3-1": "3fr 1fr",
  "1-1-1": "1fr 1fr 1fr",
  "2-1-1": "2fr 1fr 1fr",
  "1-2-1": "1fr 2fr 1fr",
  "1-1-2": "1fr 1fr 2fr",
  "1-1-1-1": "1fr 1fr 1fr 1fr",
};
/** min-column width for auto-fit grids. Maps to the SAME semantic --space-* scale
 *  as gap, so the value is always a var(--token). "none" disables auto-fit. */
const MIN_COL_WIDTH_VALUE: Record<(typeof LAYOUT_MIN_COL_WIDTHS)[number], string> = {
  none: "none",
  "3": "var(--space-3)",
  "4": "var(--space-4)",
  "5": "var(--space-5)",
  "6": "var(--space-6)",
  "8": "var(--space-8)",
  "10": "var(--space-10)",
  "12": "var(--space-12)",
};

/**
 * Merge the three breakpoint layers down to the one that applies at `device`
 * (mobile-first: desktop ⊃ tablet ⊃ base). A fresh object; never mutates inputs.
 * Used by the editor device-preview and tests; the PUBLIC page uses layoutToVars +
 * media queries instead (it can't branch on device — see file header).
 */
export function resolveLayoutLayer(layout: BlockLayout | undefined, device: Device): LayoutLayer {
  if (!layout) return {};
  return {
    ...layout.base,
    ...(device !== "mobile" ? layout.tablet : undefined),
    ...(device === "desktop" ? layout.desktop : undefined),
  };
}

/**
 * Map one resolved layout layer to the CSS CUSTOM PROPERTIES it sets (--pbl-*).
 * Undefined/empty enum values are skipped so nothing emits `undefined` and a
 * missing key at a breakpoint falls through to the property set by a lower one.
 * The returned bag is what BlockRenderer writes per @media breakpoint.
 */
export function layoutToVars(layer: LayoutLayer): Record<string, string> {
  const v: Record<string, string> = {};

  if (layer.direction) v["--pbl-direction"] = DIRECTION_VALUE[layer.direction];
  if (layer.wrap) v["--pbl-wrap"] = WRAP_VALUE[layer.wrap];
  if (layer.justify) v["--pbl-justify"] = JUSTIFY_VALUE[layer.justify];
  if (layer.align) v["--pbl-align"] = ALIGN_ITEMS_VALUE[layer.align];

  if (layer.gap) v["--pbl-gap"] = SPACE_STEP[layer.gap];
  if (layer.colGap) v["--pbl-col-gap"] = SPACE_STEP[layer.colGap];
  if (layer.rowGap) v["--pbl-row-gap"] = SPACE_STEP[layer.rowGap];

  if (layer.position) v["--pbl-position"] = POSITION_VALUE[layer.position];
  if (layer.stickyTop) v["--pbl-sticky-top"] = SPACE_STEP[layer.stickyTop];
  if (layer.zIndex) v["--pbl-z"] = Z_INDEX_VALUE[layer.zIndex];

  if (layer.order) v["--pbl-order"] = ORDER_VALUE[layer.order];
  if (layer.alignSelf) v["--pbl-align-self"] = ALIGN_SELF_VALUE[layer.alignSelf];
  if (layer.basis) v["--pbl-basis"] = BASIS_VALUE[layer.basis];
  if (layer.grow) v["--pbl-grow"] = GROW_VALUE[layer.grow];
  if (layer.shrink) v["--pbl-shrink"] = SHRINK_VALUE[layer.shrink];

  // Grid columns: an explicit uneven template wins over an even count; auto-fit
  // (minColWidth) wins over both when set, giving a responsive auto-wrapping grid.
  if (layer.minColWidth && layer.minColWidth !== "none") {
    v["--pbl-cols"] = `repeat(auto-fit, minmax(${MIN_COL_WIDTH_VALUE[layer.minColWidth]}, 1fr))`;
  } else if (layer.colTemplate) {
    v["--pbl-cols"] = COL_TEMPLATE_VALUE[layer.colTemplate];
  } else if (layer.cols) {
    v["--pbl-cols"] = COLS_TEMPLATE[layer.cols];
  }

  // Corner radius — a custom property the layout block's inner element consumes
  // (var(--pbl-radius, …)); inherits from the chrome wrapper it's set on.
  if (layer.radius) v["--pbl-radius"] = RADIUS_VAR[layer.radius];

  return v;
}

/** True when a resolved layer sets at least one custom property. Internal helper
 *  for hasAnyLayout — not part of the module's public surface. */
function hasLayout(layer: LayoutLayer): boolean {
  return Object.values(layer).some((x) => x !== undefined);
}

/** True when the whole (multi-breakpoint) layout would emit any CSS at all — lets
 *  the walker keep today's exact wrapper for blocks with no layout controls set. */
export function hasAnyLayout(layout: BlockLayout | undefined): boolean {
  if (!layout) return false;
  return (
    hasLayout(layout.base ?? {}) ||
    hasLayout(layout.tablet ?? {}) ||
    hasLayout(layout.desktop ?? {})
  );
}

/**
 * The wrapper's own declarations — they CONSUME the --pbl-* custom properties with
 * sensible fallbacks, so the same declaration block is correct at every breakpoint
 * (only the custom properties change, via @media). display flips to grid the moment
 * a column template is present, else flex. Returned as a `prop:value;…` string for
 * inlining into the scoped <style>; every right-hand side is a var() or keyword.
 *
 * `isGrid` is decided by the CALLER from the merged layout (any breakpoint sets a
 * column template) so the base rule already uses the right display mode.
 */
export function layoutBaseDecls(isGrid: boolean): string {
  const decls: string[] = [];
  if (isGrid) {
    decls.push("display:grid");
    decls.push("grid-template-columns:var(--pbl-cols, 1fr)");
    decls.push("gap:var(--pbl-gap, var(--space-6))");
    decls.push("column-gap:var(--pbl-col-gap, var(--pbl-gap, var(--space-6)))");
    decls.push("row-gap:var(--pbl-row-gap, var(--pbl-gap, var(--space-6)))");
    decls.push("align-items:var(--pbl-align, stretch)");
    decls.push("justify-content:var(--pbl-justify, initial)");
  } else {
    decls.push("display:flex");
    decls.push("flex-direction:var(--pbl-direction, row)");
    decls.push("flex-wrap:var(--pbl-wrap, nowrap)");
    decls.push("gap:var(--pbl-gap, var(--space-6))");
    decls.push("column-gap:var(--pbl-col-gap, var(--pbl-gap, var(--space-6)))");
    decls.push("row-gap:var(--pbl-row-gap, var(--pbl-gap, var(--space-6)))");
    decls.push("justify-content:var(--pbl-justify, flex-start)");
    decls.push("align-items:var(--pbl-align, stretch)");
  }
  // Positioning + self-placement apply in either mode.
  decls.push("position:var(--pbl-position, static)");
  decls.push("top:var(--pbl-sticky-top, auto)");
  decls.push("z-index:var(--pbl-z, auto)");
  decls.push("order:var(--pbl-order, 0)");
  decls.push("align-self:var(--pbl-align-self, auto)");
  decls.push("flex-basis:var(--pbl-basis, auto)");
  decls.push("flex-grow:var(--pbl-grow, 0)");
  decls.push("flex-shrink:var(--pbl-shrink, 1)");
  return decls.join(";");
}

/** True when any breakpoint sets a grid column template — decides base display. */
export function layoutIsGrid(layout: BlockLayout | undefined): boolean {
  if (!layout) return false;
  const any = (l: LayoutLayer | undefined) =>
    !!l && (l.cols !== undefined || l.colTemplate !== undefined || (l.minColWidth !== undefined && l.minColWidth !== "none"));
  return any(layout.base) || any(layout.tablet) || any(layout.desktop);
}
