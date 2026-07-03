import { cacheLife, cacheTag } from "next/cache";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { menus } from "./schema";
import { menuItemsSchema, type MenuItem } from "./validation";

export type Menu = { id: string; name: string; items: MenuItem[] };

/** Re-validate on read — a bad row degrades to an empty menu, never a crash. */
const parseRow = (row: { id: string; name: string; items: unknown }): Menu => {
  const parsed = menuItemsSchema.safeParse(row.items);
  return { id: row.id, name: row.name, items: parsed.success ? parsed.data : [] };
};

/**
 * All menus, cached for the public chrome. Invalidated via
 * updateTag("menus") whenever a menu is created/saved/deleted.
 */
export async function getMenus(): Promise<Menu[]> {
  "use cache";
  cacheLife("max");
  cacheTag("menus");
  const rows = await db.query.menus.findMany({ orderBy: [asc(menus.name)] });
  return rows.map(parseRow);
}

/** Uncached list for admin screens (always fresh). */
export async function listMenus(): Promise<Menu[]> {
  const rows = await db.query.menus.findMany({ orderBy: [asc(menus.name)] });
  return rows.map(parseRow);
}
