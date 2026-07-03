/**
 * Header layout recipes — the 16 preset arrangements. A recipe only
 * describes STRUCTURE (where the logo/nav/cta sit); all copy and links come
 * from the header config + menus. The composer (public/HeaderBar.tsx) and
 * the admin schematic thumbnails both read these.
 */

export const HEADER_GROUPS = [
  "Marketing",
  "Editorial",
  "Utility",
  "Ecommerce",
  "Product & docs",
] as const;
export type HeaderGroup = (typeof HEADER_GROUPS)[number];

export type HeaderRecipe = {
  id: HeaderLayoutId;
  label: string;
  group: HeaderGroup;
  logoPos: "left" | "center" | "centerBig";
  navPos:
    | "center"
    | "left"
    | "right"
    | "split"
    | "hidden"
    | "centerBelow"
    | "vertical"
    | "tabs"
    | "pill";
  cta: boolean;
  tiers: 1 | 2;
  icons: 0 | 1 | 2;
  search?: boolean;
  overlay?: boolean;
  underline?: boolean;
  avatar?: boolean;
};

export const HEADER_LAYOUT_IDS = [
  "center-cta",
  "left-nav",
  "split-center-logo",
  "minimal-right",
  "icon-only",
  "stacked-centered",
  "search-forward",
  "ecommerce-icons",
  "overlay-transparent",
  "sidebar-vertical",
  "split-luxury",
  "pill-nav",
  "underline-minimal",
  "utility-two-tier",
  "app-tabs",
  "editorial-statement",
] as const;
export type HeaderLayoutId = (typeof HEADER_LAYOUT_IDS)[number];

const r = (
  id: HeaderLayoutId,
  label: string,
  group: HeaderGroup,
  logoPos: HeaderRecipe["logoPos"],
  navPos: HeaderRecipe["navPos"],
  cta: boolean,
  tiers: 1 | 2,
  icons: 0 | 1 | 2,
  extras: Partial<HeaderRecipe> = {},
): HeaderRecipe => ({ id, label, group, logoPos, navPos, cta, tiers, icons, ...extras });

export const HEADER_RECIPES: Record<HeaderLayoutId, HeaderRecipe> = {
  "center-cta": r("center-cta", "Centered nav + CTA", "Marketing", "left", "center", true, 1, 0),
  "left-nav": r("left-nav", "Left nav + CTA", "Marketing", "left", "left", true, 1, 0),
  "split-center-logo": r("split-center-logo", "Split, centered logo", "Editorial", "center", "split", false, 1, 0),
  "minimal-right": r("minimal-right", "Minimal right", "Editorial", "left", "right", false, 1, 0),
  "icon-only": r("icon-only", "Logo only", "Utility", "left", "hidden", false, 1, 0),
  "stacked-centered": r("stacked-centered", "Stacked, centered", "Editorial", "center", "centerBelow", false, 1, 0),
  "search-forward": r("search-forward", "Search forward", "Ecommerce", "left", "right", false, 1, 1, { search: true }),
  "ecommerce-icons": r("ecommerce-icons", "Shop icons", "Ecommerce", "left", "left", false, 1, 2),
  "overlay-transparent": r("overlay-transparent", "Transparent overlay", "Marketing", "left", "center", true, 1, 0, { overlay: true }),
  "sidebar-vertical": r("sidebar-vertical", "Vertical sidebar", "Product & docs", "left", "vertical", true, 1, 0),
  "split-luxury": r("split-luxury", "Split luxury", "Editorial", "center", "split", false, 1, 1),
  "pill-nav": r("pill-nav", "Pill nav + CTA", "Marketing", "left", "pill", true, 1, 0),
  "underline-minimal": r("underline-minimal", "Underline minimal", "Editorial", "left", "left", false, 1, 0, { underline: true }),
  "utility-two-tier": r("utility-two-tier", "Utility two-tier", "Ecommerce", "left", "center", true, 2, 1),
  "app-tabs": r("app-tabs", "App tabs", "Product & docs", "left", "tabs", false, 1, 1, { avatar: true }),
  "editorial-statement": r("editorial-statement", "Editorial statement", "Editorial", "centerBig", "right", false, 1, 0),
};

/** Recipe lookup with a safe fallback (unknown ids render the default). */
export const headerRecipe = (id: string): HeaderRecipe =>
  HEADER_RECIPES[id as HeaderLayoutId] ?? HEADER_RECIPES["center-cta"];
