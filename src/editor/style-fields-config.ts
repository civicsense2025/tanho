import {
  SPACE_STEPS,
  FONT_SIZES,
  FONT_WEIGHTS,
  LEADINGS,
  TRACKINGS,
  FONTS,
  TEXT_COLORS,
  BACKGROUNDS,
  BORDER_WIDTHS,
  BORDER_STYLES,
  BORDER_COLORS,
  RADII,
  SHADOWS,
  ALIGNS,
  OPACITIES,
  TRANSFORMS,
  TRANSITIONS,
  FILTERS,
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
  type StyleLayer,
  type LayoutLayer,
} from "@/blocks/common";
import type { Device } from "@/blocks/types";

export type EnumControl<K> = { field: K; label: string; options: readonly string[] };
export type Group<K> = { title: string; controls: EnumControl<K>[] };

export const STYLE_GROUPS: Group<keyof StyleLayer>[] = [
  {
    title: "Spacing",
    controls: [
      { field: "padTop", label: "Pad top", options: SPACE_STEPS },
      { field: "padRight", label: "Pad right", options: SPACE_STEPS },
      { field: "padBottom", label: "Pad bottom", options: SPACE_STEPS },
      { field: "padLeft", label: "Pad left", options: SPACE_STEPS },
    ],
  },
  {
    title: "Margin",
    controls: [
      { field: "marginTop", label: "Margin top", options: SPACE_STEPS },
      { field: "marginRight", label: "Margin right", options: SPACE_STEPS },
      { field: "marginBottom", label: "Margin bottom", options: SPACE_STEPS },
      { field: "marginLeft", label: "Margin left", options: SPACE_STEPS },
    ],
  },
  {
    title: "Typography",
    controls: [
      { field: "font", label: "Font", options: FONTS },
      { field: "fontSize", label: "Size", options: FONT_SIZES },
      { field: "fontWeight", label: "Weight", options: FONT_WEIGHTS },
      { field: "leading", label: "Line height", options: LEADINGS },
      { field: "tracking", label: "Tracking", options: TRACKINGS },
      { field: "align", label: "Align", options: ALIGNS },
    ],
  },
  {
    title: "Color",
    controls: [
      { field: "textColor", label: "Text", options: TEXT_COLORS },
      { field: "background", label: "Background", options: BACKGROUNDS },
    ],
  },
  {
    title: "Border",
    controls: [
      { field: "borderWidth", label: "Border width", options: BORDER_WIDTHS },
      { field: "borderStyle", label: "Border style", options: BORDER_STYLES },
      { field: "borderColor", label: "Border color", options: BORDER_COLORS },
      { field: "radius", label: "Radius", options: RADII },
      { field: "shadow", label: "Shadow", options: SHADOWS },
    ],
  },
  {
    title: "Effects",
    controls: [
      { field: "opacity", label: "Opacity", options: OPACITIES },
      { field: "transform", label: "Transform", options: TRANSFORMS },
      { field: "transition", label: "Transition", options: TRANSITIONS },
      { field: "filter", label: "Filter", options: FILTERS },
    ],
  },
];

/** Advanced layout controls — flex/grid/positioning, all token-enums. Split into
 *  sub-groups so the (large) control set stays navigable in the rail. */
export const LAYOUT_GROUPS: Group<keyof LayoutLayer>[] = [
  {
    title: "Flow",
    controls: [
      { field: "direction", label: "Direction", options: LAYOUT_DIRECTIONS },
      { field: "wrap", label: "Wrap", options: LAYOUT_WRAPS },
      { field: "justify", label: "Justify", options: LAYOUT_JUSTIFIES },
      { field: "align", label: "Align items", options: LAYOUT_ALIGN_ITEMS },
      { field: "gap", label: "Gap", options: SPACE_STEPS },
      { field: "colGap", label: "Column gap", options: SPACE_STEPS },
      { field: "rowGap", label: "Row gap", options: SPACE_STEPS },
    ],
  },
  {
    title: "Grid columns",
    controls: [
      { field: "cols", label: "Columns", options: LAYOUT_COLS },
      { field: "colTemplate", label: "Uneven template", options: LAYOUT_COL_TEMPLATES },
      { field: "minColWidth", label: "Min col width (auto-fit)", options: LAYOUT_MIN_COL_WIDTHS },
    ],
  },
  {
    title: "Position",
    controls: [
      { field: "position", label: "Position", options: LAYOUT_POSITIONS },
      { field: "stickyTop", label: "Sticky top", options: SPACE_STEPS },
      { field: "zIndex", label: "Z-index", options: LAYOUT_Z_INDEXES },
    ],
  },
  {
    title: "Self placement",
    controls: [
      { field: "order", label: "Order", options: LAYOUT_ORDERS },
      { field: "alignSelf", label: "Align self", options: LAYOUT_ALIGN_SELVES },
      { field: "basis", label: "Basis", options: LAYOUT_BASES },
      { field: "grow", label: "Grow", options: LAYOUT_GROWS },
      { field: "shrink", label: "Shrink", options: LAYOUT_SHRINKS },
    ],
  },
  {
    title: "Shape",
    controls: [{ field: "radius", label: "Corner radius", options: RADII }],
  },
];

export const DEVICE_TABS: { id: Device; label: string }[] = [
  { id: "mobile", label: "Mobile" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

export const layerKey = (d: Device): "base" | "tablet" | "desktop" => (d === "mobile" ? "base" : d);

/** Mobile-first override semantics per device — surfaced in the Style header so it's
 *  obvious tablet/desktop carry their OWN overrides that scale up from base. */
export const DEVICE_META: Record<Device, { blurb: string }> = {
  mobile: { blurb: "Base styles — apply to all sizes" },
  tablet: { blurb: "Overrides Mobile at 768px and up" },
  desktop: { blurb: "Overrides Mobile & Tablet at 1024px and up" },
};

export const headStyle = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-2xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-muted)",
} as const;

/** Zone divider — a more prominent section header than `headStyle`. The first zone
 *  (Style) omits the top border via `zoneHeaderFirstStyle`. */
export const zoneHeaderStyle = {
  ...headStyle,
  fontSize: "var(--text-xs)",
  color: "var(--text-muted)",
  padding: "var(--space-2) 0",
  borderTop: "1px solid var(--border)",
  marginTop: "var(--space-3)",
} as const;

export const zoneHeaderFirstStyle = {
  ...zoneHeaderStyle,
  borderTop: "none",
  marginTop: 0,
} as const;

export const summaryStyle = {
  cursor: "pointer",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-2xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-faint)",
  padding: "var(--space-1) 0",
} as const;
