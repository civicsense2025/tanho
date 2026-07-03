import { settings } from "../../src/modules/settings/schema";
import {
  announcementConfigSchema,
  footerConfigSchema,
  headerConfigSchema,
} from "../../src/modules/chrome/validation";
import { log, type SeedDb } from "../lib";

/**
 * Default chrome settings rows — schema defaults (header "center-cta" with
 * CTA off, footer "simple-centered", announcement disabled) wired to the
 * seeded Main menu. Logo text and copyright stay empty on purpose: they
 * fall back to the site name at render time (white-label rule).
 */
export async function seedChrome(db: SeedDb, mainMenuId: string) {
  const rows = [
    { namespace: "header", data: headerConfigSchema.parse({ menuId: mainMenuId }) },
    {
      namespace: "footer",
      data: footerConfigSchema.parse({ columns: [{ title: "Explore", menuId: mainMenuId }] }),
    },
    { namespace: "announcement", data: announcementConfigSchema.parse({}) },
  ];

  for (const row of rows) {
    await db.insert(settings).values(row).onConflictDoNothing();
  }
  log("chrome settings seeded (skip if present)");
}
