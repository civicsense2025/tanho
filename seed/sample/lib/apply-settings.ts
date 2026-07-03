import { eq } from "drizzle-orm";
import { settings } from "../../../src/modules/settings/schema";
import { theme } from "../../../src/modules/theme/schema";
import { menus } from "../../../src/modules/menus/schema";
import { generalSettingsSchema } from "../../../src/modules/settings/validation";
import { seoSettingsSchema } from "../../../src/modules/seo/validation";
import { themeInputSchema } from "../../../src/modules/theme/validation";
import { menuItemsSchema } from "../../../src/modules/menus/validation";
import {
  footerConfigSchema,
  headerConfigSchema,
} from "../../../src/modules/chrome/validation";
import { createId } from "@paralleldrive/cuid2";
import { log, type SeedDb } from "../../lib";
import type { SamplePack } from "./types";

async function put(db: SeedDb, namespace: string, data: unknown) {
  await db
    .insert(settings)
    .values({ namespace, data, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data, updatedAt: Date.now() },
    });
}

/** Apply theme, general/SEO settings, the Main menu, and header/footer chrome. */
export async function applySettings(db: SeedDb, pack: SamplePack): Promise<void> {
  // Theme — overwrite the singleton so the sample lands its exact palette.
  const themeValues = {
    id: "theme",
    ...themeInputSchema.parse({
      font: "geist",
      baseSize: 16,
      headingScale: 1.05,
      leading: 1.6,
      density: 1,
      radius: "soft",
      shadow: "subtle",
      ...pack.theme,
    }),
    updatedAt: Date.now(),
  };
  const existingTheme = await db.query.theme.findFirst();
  if (existingTheme) {
    await db.update(theme).set(themeValues).where(eq(theme.id, "theme"));
  } else {
    await db.insert(theme).values(themeValues);
  }

  // General + SEO — the sample brand name lives here (seed/ is exempt from the
  // white-label grep; it's the sanctioned place for demo copy).
  await put(
    db,
    "general",
    generalSettingsSchema.parse({
      name: pack.meta.brand,
      tagline: pack.meta.tagline,
      timezone: "America/New_York",
      language: "en",
      indexable: true,
    }),
  );
  await put(db, "seo", seoSettingsSchema.parse({ siteUrl: "https://example.com" }));

  // Main menu — items validated; every href is checked against seeded routes
  // by the orchestrator before this runs.
  const items = menuItemsSchema.parse(
    pack.menu.map((m) => ({
      id: `mi_${createId()}`,
      label: m.label,
      href: m.href,
      ...(m.children
        ? {
            dropdownStyle: "simple",
            children: m.children.map((c) => ({
              id: `mi_${createId()}`,
              label: c.label,
              href: c.href,
            })),
          }
        : {}),
    })),
  );
  const existingMenu = await db.query.menus.findFirst({ where: eq(menus.name, "Main") });
  let mainMenuId: string;
  if (existingMenu) {
    await db.update(menus).set({ items }).where(eq(menus.id, existingMenu.id));
    mainMenuId = existingMenu.id;
  } else {
    const [row] = await db
      .insert(menus)
      .values({ name: "Main", items })
      .returning({ id: menus.id });
    mainMenuId = row!.id;
  }

  // Header + footer wired to the Main menu.
  await put(db, "header", headerConfigSchema.parse({ menuId: mainMenuId }));
  await put(
    db,
    "footer",
    footerConfigSchema.parse({ columns: [{ title: "Explore", menuId: mainMenuId }] }),
  );

  log(`sample settings applied for "${pack.meta.brand}"`);
}
