import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * Navigation menu — resolves a saved menu (by id, via modules/menus) and
 * renders it as an inline bar with dropdowns on desktop and a collapsible
 * drawer/panel on mobile. Replaces the config-driven header `menuId` + the
 * NavInline/MobileNav pair; a **bound** block (menu data is CMS state).
 */
export const navMenuSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Menu to render; empty = the first menu (graceful, like the old header). */
  menuId: z.string().max(64).default(""),
  /** Inline desktop nav style — ported from the header recipes. */
  variant: z.enum(["plain", "underline", "tabs", "pill", "vertical"]).default("plain"),
  /** Mobile disclosure style — ported from header `mobile.style`. */
  mobileStyle: z.enum(["drawer-right", "drawer-left", "fullscreen", "dropdown"]).default("drawer-right"),
  /** Accessible label for the <nav> landmark (two navs on a page need distinct
   *  labels; e.g. "Primary" for the header, "Footer" for the footer). */
  ariaLabel: z.string().max(40).default("Primary"),
  /** Which top-level items to render — split evenly (`Math.ceil(count / 2)`
   *  in the first half), nested children stay with their parent item. Lets
   *  two nav-menu blocks share one menu split around a centered logo (the old
   *  header recipes' "split" nav arrangement — see site-header's `layout:
   *  "split"`); a single nav-menu almost always wants `all`. */
  slice: z.enum(["all", "first-half", "second-half"]).default("all"),
});

export type NavMenuContent = z.infer<typeof navMenuSchema>;

export const makeNavMenu = (): NavMenuContent =>
  navMenuSchema.parse({ menuId: "", variant: "plain", mobileStyle: "drawer-right", ariaLabel: "Primary" });
