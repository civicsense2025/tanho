/**
 * Neutral seed — brand-agnostic starter content. Idempotent: existing rows
 * are left untouched. Run with: npm run seed
 *
 * Module seeds register below as their modules land.
 */
import { seedDb, log } from "./lib";
import { seedSettings } from "./modules/settings";
import { seedTheme } from "./modules/theme";
import { seedOwner } from "./modules/users";
import { seedPages } from "./modules/pages";
import { seedMenus } from "./modules/menus";
import { seedChrome } from "./modules/chrome";
import { seedSeo } from "./modules/seo";
import { seedProfile } from "./modules/profile";
import { seedEntries } from "./modules/entries";
import { seedPeople } from "./modules/people";
import { seedCommerce } from "./modules/commerce";
import { seedMemberships } from "./modules/memberships";
import { seedScheduling } from "./modules/scheduling";
import { seedAnalytics } from "./modules/analytics";
import { seedForms } from "./modules/forms";
import { seedHardening } from "./modules/hardening";

async function main() {
  const db = seedDb();
  await seedSettings(db);
  await seedTheme(db);
  await seedOwner(db);
  await seedPages(db);
  const { mainMenuId } = await seedMenus(db);
  await seedChrome(db, mainMenuId);
  await seedSeo(db);
  await seedProfile(db);
  await seedEntries(db);
  await seedPeople(db);
  await seedCommerce(db);
  await seedMemberships(db);
  await seedScheduling(db);
  await seedForms(db);
  await seedAnalytics(db);
  await seedHardening(db);
  log("neutral seed complete");
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
