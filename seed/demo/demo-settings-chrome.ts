import { createId } from "@paralleldrive/cuid2";
import { settings } from "../../src/modules/settings/schema";
import { blockSets } from "../../src/modules/pages/schema";
import { generalSettingsSchema } from "../../src/modules/settings/validation";
import { seoSettingsSchema } from "../../src/modules/seo/validation";
import { ecommerceSettingsSchema } from "../../src/modules/commerce/validation";
import { validateBlockTree } from "../../src/modules/pages/blocks-io";
import { CHROME_OWNER_ID } from "../../src/modules/chrome/owners";
import { log, type SeedDb } from "../lib";
import type { DemoMenuIds } from "./demo-menus";

/** Upsert a settings namespace so the demo is authoritative + idempotent. */
async function put(db: SeedDb, namespace: string, data: unknown) {
  await db
    .insert(settings)
    .values({ namespace, data, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data, updatedAt: Date.now() },
    });
}

const b = (type: string, content: Record<string, unknown>) => ({
  id: `b_${createId()}`,
  type,
  content,
});

/** Upsert a chrome owner's block tree (draft + published), validated. */
async function putChrome(db: SeedDb, ownerType: "chrome:header" | "chrome:footer", tree: unknown) {
  const v = validateBlockTree(tree);
  if (!v.ok) throw new Error(`[seed] demo ${ownerType} tree invalid: ${v.error}`);
  for (const variant of ["draft", "published"] as const) {
    await db
      .insert(blockSets)
      .values({ ownerType, ownerId: CHROME_OWNER_ID, variant, blocks: v.blocks, savedAt: Date.now() })
      .onConflictDoUpdate({
        target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
        set: { blocks: v.blocks, savedAt: Date.now() },
      });
  }
}

/**
 * Demo general settings + SEO + ecommerce unlock, plus the header/footer BLOCK
 * TREES (the Phase 3 clean-cutover replacement for the old chrome settings). All
 * brand strings (site name, logo "Tan Ho", copyright) live here — the one
 * sanctioned place per the white-label rule.
 */
export async function seedDemoSettingsChrome(db: SeedDb, menus: DemoMenuIds) {
  await put(
    db,
    "general",
    generalSettingsSchema.parse({
      name: "Tan Ho Studio",
      tagline: "Design, guides, and small software for people who want to own their site.",
      timezone: "America/Toronto",
      language: "en",
      indexable: true,
    }),
  );
  await put(db, "seo", seoSettingsSchema.parse({ siteUrl: "https://tanho.studio" }));

  // Header: announcement strip + left-nav bar with a wordmark logo and a CTA.
  await putChrome(db, "chrome:header", [
    b("announcement", {
      // marquee scrolls ALL messages; the static styles (solid/gradient/…)
      // intentionally show only the first (each carries its own CTA). Two
      // messages here → marquee so both are visible.
      style: "marquee",
      tone: "accent",
      messages: [
        { text: "New guide: move your site off a hosted builder without losing your search rankings.", ctaLabel: "Read it", ctaHref: "/guides" },
        { text: "Riso prints back in stock — limited run.", ctaLabel: "Shop", ctaHref: "/shop" },
      ],
    }),
    b("site-header", {
      sticky: true,
      layout: "spread",
      transparentOnHero: false,
      blocks: [
        b("logo", { text: "Tan Ho", style: "wordmark", icon: "TH", big: false, invert: false }),
        b("nav-menu", { menuId: menus.mainMenuId, variant: "plain", mobileStyle: "drawer-right", ariaLabel: "Primary" }),
        b("cta-button", { label: "Subscribe", href: "/newsletter", variant: "solid" }),
      ],
    }),
  ]);

  // Footer: multi-column with two menus, a social row, and a custom copyright.
  await putChrome(db, "chrome:footer", [
    b("site-footer", {
      layout: "columns",
      dark: false,
      copyright: "© Tan Ho Studio. Made with tools I own.",
      blocks: [
        b("logo", { text: "Tan Ho", style: "wordmark", icon: "TH", big: false, invert: false }),
        b("footer-column", { title: "Explore", menuId: menus.footerExploreId }),
        b("footer-column", { title: "More", menuId: menus.footerMoreId }),
        b("social-links", { menuId: menus.socialMenuId, align: "left" }),
      ],
    }),
  ]);

  await put(
    db,
    "ecommerce",
    ecommerceSettingsSchema.parse({ unlocked: true, origin: "Toronto, ON, Canada", processingDays: "2–3 business days" }),
  );

  log("demo settings + chrome block trees + seo + ecommerce upserted");
}
