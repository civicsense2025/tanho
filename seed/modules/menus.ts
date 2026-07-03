import { createId } from "@paralleldrive/cuid2";
import { menus } from "../../src/modules/menus/schema";
import { menuItemsSchema } from "../../src/modules/menus/validation";
import { log, type SeedDb } from "../lib";

const mi = (label: string, href: string) => ({ id: `mi_${createId()}`, label, href });

/**
 * Neutral starter navigation. Returns the Main menu id so the chrome seed
 * can wire it into the header + a footer column.
 */
export async function seedMenus(db: SeedDb): Promise<{ mainMenuId: string }> {
  const existing = await db.query.menus.findFirst();
  if (existing) {
    log("menus: content already exists — skipping menu seed");
    return { mainMenuId: existing.id };
  }

  // Blank-slate menu: link ONLY to pages this seed actually creates (just Home),
  // so a fresh install has no dangling nav that 404s. Deployers add pages in the
  // admin and link them here. For an explorable, fully-populated starting point,
  // use an industry sample: `npm run seed:sample -- <industry>`.
  const items = menuItemsSchema.parse([mi("Home", "/")]);

  const [row] = await db
    .insert(menus)
    .values({ name: "Main", items })
    .returning({ id: menus.id });
  log("main menu seeded");
  return { mainMenuId: row.id };
}
