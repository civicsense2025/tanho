import { getMenus } from "@/modules/menus/queries";
import type { MenuItem } from "@/modules/menus/validation";
import type { NavMenuContent } from "./fields";

/**
 * `items` is what desktop renders (respects `slice`); `mobileItems` is always
 * the COMPLETE, unsliced menu. A split-nav header uses two nav-menu blocks
 * (one per half) around a centered logo on desktop, but on mobile there is no
 * "around the logo" layout to split for — matching the old header composer's
 * own behaviour (its single mobile burger always showed the full items list,
 * never the split desktop halves), each block's mobile burger shows the whole
 * menu too, not just its own half.
 */
export type NavMenuResolved = { items: MenuItem[]; mobileItems: MenuItem[] };

/**
 * Splits the TOP-LEVEL items list in half (nested children stay attached to
 * their parent — only the top level is divided). `Math.ceil(count / 2)` in
 * the first half, matching the old header composer's exact split arithmetic
 * (`items.slice(0, Math.ceil(items.length / 2))` / `items.slice(half)`), so
 * a migrated split-nav header lands on the same boundary the old one did.
 */
function sliceItems(items: MenuItem[], slice: NavMenuContent["slice"]): MenuItem[] {
  if (slice === "all") return items;
  const half = Math.ceil(items.length / 2);
  return slice === "first-half" ? items.slice(0, half) : items.slice(half);
}

/**
 * Server-only: the menu items for this nav. Reads the cached menu set
 * (`getMenus`, tag `menus`) and picks the configured menu, degrading to the
 * first menu when the id is empty/unknown — the exact graceful behaviour the
 * old ChromeHeader had (`menus.find(...) ?? menus[0]`).
 */
export async function resolveNavMenu(content: NavMenuContent): Promise<NavMenuResolved> {
  const menus = await getMenus();
  const menu = menus.find((m) => m.id === content.menuId) ?? menus[0];
  const mobileItems = menu?.items ?? [];
  return { items: sliceItems(mobileItems, content.slice), mobileItems };
}
