import type { MenuItem } from "@/modules/menus/validation";
import { menuItemsById } from "../menu-resolve";
import type { SocialLinksContent } from "./fields";

export type SocialLinksResolved = { items: MenuItem[] };

/** Server-only: the configured menu's items for the social row. */
export async function resolveSocialLinks(content: SocialLinksContent): Promise<SocialLinksResolved> {
  return { items: await menuItemsById(content.menuId) };
}
