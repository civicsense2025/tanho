import type { MenuItem } from "@/modules/menus/validation";
import { menuItemsById } from "../menu-resolve";
import type { FooterColumnContent } from "./fields";

export type FooterColumnResolved = { items: MenuItem[] };

/**
 * Server-only: the configured menu's items, flattened one level (each item plus
 * its children) — the exact shape the old FooterBar MenuColumn rendered.
 */
export async function resolveFooterColumn(content: FooterColumnContent): Promise<FooterColumnResolved> {
  const items = await menuItemsById(content.menuId);
  const flat = items.flatMap((item) => [item, ...(item.children ?? [])]);
  return { items: flat };
}
