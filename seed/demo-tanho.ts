/**
 * Demo seed — reproduces the design system's full "Tan Ho" sample site as
 * ordinary, editable database content. This proves the platform is truly
 * white-label: every brand value (the name "Tan Ho Studio", the warm-maroon
 * palette, the copy, the nav, the sample projects/guides/products) lives ONLY
 * here in seed/demo-tanho.ts and its seed/demo/* helpers — never in src/.
 *
 * Idempotent: run `npm run seed:demo` as many times as you like. Settings and
 * singletons are upserted; content rows are matched by slug/email and updated
 * in place rather than duplicated. Typically run after `npm run seed`
 * (neutral), on top of a migrated dev database.
 *
 * Run with: npm run seed:demo
 */
import { seedDb, log } from "./lib";
import { seedDemoTheme } from "./demo/demo-theme";
import { seedDemoMenus } from "./demo/demo-menus";
import { seedDemoSettingsChrome } from "./demo/demo-settings-chrome";
import { seedDemoProfile } from "./demo/demo-profile";
import { seedDemoHomeAbout } from "./demo/demo-pages";
import { seedDemoMarketingPages } from "./demo/demo-pages-marketing";
import { seedDemoNewsletter } from "./demo/demo-newsletter";
import { seedDemoProjects } from "./demo/demo-projects";
import { seedDemoGuidesTaxonomy } from "./demo/demo-guides-taxonomy";
import { seedDemoGuides } from "./demo/demo-guides";
import { seedDemoShop } from "./demo/demo-shop";
import { seedDemoMembership } from "./demo/demo-membership";
import { seedDemoPeople } from "./demo/demo-people";

async function main() {
  const db = seedDb();

  await seedDemoTheme(db);
  const menus = await seedDemoMenus(db);
  await seedDemoSettingsChrome(db, menus);

  await seedDemoProfile(db);
  await seedDemoProjects(db);

  await seedDemoGuidesTaxonomy(db);
  await seedDemoGuides(db);

  await seedDemoShop(db);
  await seedDemoMembership(db);

  await seedDemoHomeAbout(db);
  await seedDemoMarketingPages(db);
  await seedDemoNewsletter(db);

  await seedDemoPeople(db);

  log("demo seed complete — the Tan Ho sample site is live");
}

main().catch((err) => {
  console.error("[seed:demo] failed:", err);
  process.exit(1);
});
