/**
 * Sample-seed CLI — WordPress-style explorable demo content, per industry.
 *
 *   npm run seed:sample -- <industry>   (tech | artist | services | nonprofit)
 *   npm run seed:sample                 (prompts interactively in a terminal;
 *                                         defaults to tech when non-interactive)
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
import { createInterface } from "node:readline/promises";
import { seedDb, log } from "./lib";
import { seedSettings } from "./modules/settings";
import { seedOwner } from "./modules/users";
import { seedCommerce } from "./modules/commerce";
import { seedHardening } from "./modules/hardening";
import { applySamplePack } from "./sample/lib/apply";
import { unlockEcommerceForSample } from "./sample/lib/unlock";
import { SAMPLE_PACKS, SAMPLE_KEYS } from "./sample/packs";

async function promptForIndustry(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("\nWhich industry sample would you like to seed?\n");
  for (const [i, key] of SAMPLE_KEYS.entries()) {
    const { brand, tagline } = SAMPLE_PACKS[key].meta;
    console.log(`  ${i + 1}. ${key} — ${brand}: ${tagline}`);
  }
  const answer = (await rl.question("\nEnter a number or name [tech]: ")).trim().toLowerCase();
  rl.close();
  if (!answer) return "tech";
  const byIndex = Number(answer);
  if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= SAMPLE_KEYS.length) {
    return SAMPLE_KEYS[byIndex - 1];
  }
  return answer;
}

async function main() {
  const argKey = process.argv[2]?.toLowerCase();
  const key = argKey ?? (process.stdin.isTTY ? await promptForIndustry() : "tech");
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
