/**
 * Sample-seed CLI — WordPress-style explorable demo content, per industry.
 *
 *   npm run seed:sample -- <industry>   (tech | artist | services | nonprofit)
 *
 * Each sample is a FICTIONAL brand-neutral site that populates every feature so
 * the platform is fully explorable out of the box. Gated features (ecommerce,
 * AI, paid bookings) render "disabled until enabled"; set SAMPLE_UNLOCK=1 to
 * also flip ecommerce on and explore the unlocked storefront.
 *
 * It first runs the neutral base seed (owner account + settings/theme defaults),
 * then overlays the chosen sample pack. `npm run seed` (neutral) stays a truly
 * empty blank slate for real deployments.
 */
import { seedDb, log } from "./lib";
import { seedSettings } from "./modules/settings";
import { seedOwner } from "./modules/users";
import { seedCommerce } from "./modules/commerce";
import { seedHardening } from "./modules/hardening";
import { applySamplePack } from "./sample/lib/apply";
import { unlockEcommerceForSample } from "./sample/lib/unlock";
import { SAMPLE_PACKS, SAMPLE_KEYS } from "./sample/packs";

async function main() {
  const key = (process.argv[2] ?? "tech").toLowerCase();
  const pack = SAMPLE_PACKS[key];
  if (!pack) {
    console.error(
      `[seed:sample] unknown industry "${key}". Choose one of: ${SAMPLE_KEYS.join(", ")}`,
    );
    process.exit(1);
  }

  const db = seedDb();

  // Base: owner account + neutral settings/commerce/hardening namespaces
  // (ecommerce + payments + AI left locked/unconfigured — the gated state).
  await seedSettings(db);
  await seedOwner(db);
  await seedCommerce(db);
  await seedHardening(db);

  // Overlay the industry sample content.
  await applySamplePack(db, pack);

  // Optionally unlock the store to explore the enabled storefront path.
  if (process.env.SAMPLE_UNLOCK === "1") {
    await unlockEcommerceForSample(db);
    log("SAMPLE_UNLOCK=1 → ecommerce store unlocked (explore the enabled path)");
  }

  log(`sample seed complete — "${pack.meta.brand}" (${key}) is live. Run \`npm run dev\`.`);
}

main().catch((err) => {
  console.error("[seed:sample] failed:", err);
  process.exit(1);
});
