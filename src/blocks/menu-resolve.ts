import { getMenus } from "@/modules/menus/queries";
import type { MenuItem } from "@/modules/menus/validation";

/**
 * Server-only helper: the items of a specific saved menu, or `[]` when the id
 * is empty/unknown. Shared by the chrome blocks that bind to a single menu
 * (social-links, footer-column). `nav-menu` has its own resolver because it
 * additionally falls back to the first menu.
 */
export async function menuItemsById(menuId: string): Promise<MenuItem[]> {
  if (!menuId) return [];
  const menus = await getMenus();
  return menus.find((m) => m.id === menuId)?.items ?? [];
}
