import type { Device } from "./types";

/**
 * Page-level layout knobs — port of the design's pageLayout(). One source
 * of truth shared by the editor preview and the public renderer so layout
 * can't drift between edit and published views.
 */

export type PageLayoutSettings = {
  gutter?: "none" | "narrow" | "normal" | "wide";
  padY?: "none" | "sm" | "md" | "lg";
  blockGap?: "none" | "sm" | "md" | "lg";
  maxWidth?: "narrow" | "normal" | "wide" | "full";
};

export const SPACE_PX: Record<string, number> = {
  none: 0,
  sm: 16,
  md: 32,
  lg: 56,
  xl: 96,
};

const PAGE_GUTTER: Record<string, string> = {
  none: "0px",
  narrow: "var(--space-4)",
  normal: "var(--space-8)",
  wide: "var(--space-12)",
};
const PAGE_PADY: Record<string, string> = {
  none: "0px",
  sm: "var(--space-6)",
  md: "var(--space-10)",
  lg: "var(--space-16, 8rem)",
};
const PAGE_GAP: Record<string, string> = {
  none: "0px",
  sm: "var(--space-4)",
  md: "var(--space-8)",
  lg: "var(--space-12)",
};
const PAGE_MAXW: Record<string, string> = {
  narrow: "48rem",
  normal: "var(--width-content)",
  wide: "80rem",
  full: "none",
};

export function pageGutter(l: PageLayoutSettings, device: Device): string {
  const g = l.gutter ?? "normal";
  if (g === "none") return "0px";
  if (device === "mobile") return "var(--space-5)";
  return PAGE_GUTTER[g] ?? PAGE_GUTTER.normal;
}

export function pageLayout(l: PageLayoutSettings, device: Device) {
  return {
    gutter: pageGutter(l, device),
    padY: PAGE_PADY[l.padY ?? "md"] ?? PAGE_PADY.md,
    gap: PAGE_GAP[l.blockGap ?? "md"] ?? PAGE_GAP.md,
    maxWidth: PAGE_MAXW[l.maxWidth ?? "normal"] ?? PAGE_MAXW.normal,
  };
}
