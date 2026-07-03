import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { menus } from "../../src/modules/menus/schema";
import { menuItemsSchema } from "../../src/modules/menus/validation";
import { log, type SeedDb } from "../lib";

const mi = (label: string, href: string, extra: Record<string, unknown> = {}) => ({
  id: `mi_${createId()}`,
  label,
  href,
  ...extra,
});

export type DemoMenuIds = {
  mainMenuId: string;
  footerExploreId: string;
  footerMoreId: string;
  socialMenuId: string;
};

/**
 * Demo navigation — the Tan Ho site's Main nav, two footer columns, and a
 * social-links menu, reproduced from pb-chrome-data.js. The demo is
 * authoritative: a menu with the same name (e.g. the neutral "Main") has its
 * items overwritten with the demo nav; a missing one is inserted. Idempotent.
 */
export async function seedDemoMenus(db: SeedDb): Promise<DemoMenuIds> {
  const specs: Array<{ name: string; items: unknown }> = [
    {
      name: "Main",
      items: menuItemsSchema.parse([
        mi("Work", "/"),
        mi("Guides", "/guides"),
        mi("Resources", "/resources"),
        mi("Shop", "/shop"),
        {
          ...mi("More", "#"),
          dropdownStyle: "simple",
          children: [
            mi("Newsletter", "/newsletter"),
            mi("Services", "/services"),
            mi("Pricing", "/pricing"),
            mi("License", "/license"),
            mi("Membership", "/membership"),
            mi("About", "/about"),
            mi("Contact", "/contact"),
          ],
        },
      ]),
    },
    {
      name: "Footer — Explore",
      items: menuItemsSchema.parse([
        mi("Work", "/"),
        mi("Guides", "/guides"),
        mi("Resources", "/resources"),
        mi("Shop", "/shop"),
      ]),
    },
    {
      name: "Footer — More",
      items: menuItemsSchema.parse([
        mi("About", "/about"),
        mi("Services", "/services"),
        mi("Newsletter", "/newsletter"),
        mi("License", "/license"),
        mi("Contact", "/contact"),
      ]),
    },
    {
      name: "Social",
      items: menuItemsSchema.parse([
        mi("Bluesky", "https://bsky.app/profile/tanho.studio"),
        mi("GitHub", "https://github.com/tanho"),
        mi("Email", "mailto:hey@tanho.studio"),
      ]),
    },
  ];

  const ids: Record<string, string> = {};
  for (const spec of specs) {
    const existing = await db.query.menus.findFirst({
      where: (m, { eq: eqf }) => eqf(m.name, spec.name),
    });
    if (existing) {
      await db
        .update(menus)
        .set({ items: spec.items as unknown[], updatedAt: Date.now() })
        .where(eq(menus.id, existing.id));
      ids[spec.name] = existing.id;
    } else {
      const [row] = await db
        .insert(menus)
        .values({ name: spec.name, items: spec.items as unknown[] })
        .returning({ id: menus.id });
      ids[spec.name] = row.id;
    }
  }

  log("demo menus seeded (Main / Footer / Social, authoritative)");
  return {
    mainMenuId: ids["Main"],
    footerExploreId: ids["Footer — Explore"],
    footerMoreId: ids["Footer — More"],
    socialMenuId: ids["Social"],
  };
}
