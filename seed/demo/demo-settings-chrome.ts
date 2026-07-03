import { settings } from "../../src/modules/settings/schema";
import { generalSettingsSchema } from "../../src/modules/settings/validation";
import { seoSettingsSchema } from "../../src/modules/seo/validation";
import {
  announcementConfigSchema,
  footerConfigSchema,
  headerConfigSchema,
} from "../../src/modules/chrome/validation";
import { ecommerceSettingsSchema } from "../../src/modules/commerce/validation";
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

/**
 * Demo general settings + chrome (header / footer / announcement) + SEO
 * defaults + ecommerce unlock. All brand strings (site name, logo "Tan Ho",
 * siteUrl) live here — this is the one sanctioned place per the white-label
 * rule. Reproduces pb-chrome-data.js defaults.
 */
export async function seedDemoSettingsChrome(db: SeedDb, menus: DemoMenuIds) {
  const general = generalSettingsSchema.parse({
    name: "Tan Ho Studio",
    tagline: "Design, guides, and small software for people who want to own their site.",
    timezone: "America/Toronto",
    language: "en",
    indexable: true,
  });
  await put(db, "general", general);

  const seo = seoSettingsSchema.parse({
    siteUrl: "https://tanho.studio",
  });
  await put(db, "seo", seo);

  const header = headerConfigSchema.parse({
    layout: "left-nav",
    logo: { text: "Tan Ho", style: "wordmark", icon: "TH" },
    menuId: menus.mainMenuId,
    cta: { enabled: true, label: "Subscribe", href: "/newsletter", variant: "solid" },
    sticky: true,
    transparentOnHero: false,
  });
  await put(db, "header", header);

  const footer = footerConfigSchema.parse({
    layout: "newsletter-forward",
    logo: { text: "Tan Ho", style: "wordmark", icon: "TH" },
    columns: [
      { title: "Explore", menuId: menus.footerExploreId },
      { title: "More", menuId: menus.footerMoreId },
    ],
    socialMenuId: menus.socialMenuId,
    newsletter: {
      enabled: true,
      title: "The newsletter",
      body: "Field notes on owning your site — new issues, roughly monthly.",
      cta: "Subscribe",
    },
    copyright: "© Tan Ho Studio. Made with tools I own.",
  });
  await put(db, "footer", footer);

  const announcement = announcementConfigSchema.parse({
    enabled: true,
    style: "solid",
    tone: "accent",
    dismissible: true,
    rotateMs: 6000,
    messages: [
      {
        text: "New guide: move your site off a hosted builder without losing your search rankings.",
        cta: { label: "Read it", url: "/guides" },
      },
      { text: "Riso prints back in stock — limited run.", cta: { label: "Shop", url: "/shop" } },
    ],
  });
  await put(db, "announcement", announcement);

  const ecommerce = ecommerceSettingsSchema.parse({
    unlocked: true,
    origin: "Toronto, ON, Canada",
    processingDays: "2–3 business days",
  });
  await put(db, "ecommerce", ecommerce);

  log("demo settings + chrome + seo + ecommerce upserted");
}
