import { and, eq, notInArray } from "drizzle-orm";
import { entries } from "../../src/modules/entries/schema";
import { upsertEntry } from "./demo-entry-helper";
import { log, type SeedDb } from "../lib";

/**
 * Remove taxonomy rows of a type whose slug isn't in the demo set. The neutral
 * seed ships generic platforms/matrix pairs (e.g. "hosted-site-builder"); the
 * demo replaces them with named vendors so the guides + roadmap matrix line up.
 */
async function reconcileTaxonomy(db: SeedDb, type: string, keepSlugs: string[]) {
  await db
    .delete(entries)
    .where(and(eq(entries.type, type), notInArray(entries.slug, keepSlugs)));
}

/**
 * Demo guides taxonomy — the 6 "own your ___" hubs, 15 real platforms (named
 * vendors, unlike the neutral seed's generic labels), the 7-pair roadmap
 * matrix, and ~11 resources including the internal-only one and the quiz
 * interactive resource. Reproduces guides-data.js GUIDES_DATA.
 */

const HUBS = [
  { slug: "own-your-stack", title: "Own your stack", tagline: "Move off rented tools and run your own software." },
  { slug: "own-your-data", title: "Own your data", tagline: "Export, back up, and control the information that's yours." },
  { slug: "own-your-domain", title: "Own your domain", tagline: "Put your name on an address no platform can take away." },
  { slug: "own-your-audience", title: "Own your audience", tagline: "Reach your people directly instead of renting an algorithm." },
  { slug: "own-your-money", title: "Own your money", tagline: "Take payments and keep more of what you earn." },
  { slug: "own-your-code", title: "Own your code", tagline: "Host, version, and control the code you depend on." },
];

const PLATFORMS: Array<{ slug: string; name: string; kind: "source" | "target"; category: string }> = [
  { slug: "squarespace", name: "Squarespace", kind: "source", category: "Website" },
  { slug: "wix", name: "Wix", kind: "source", category: "Website" },
  { slug: "wordpress-com", name: "WordPress.com", kind: "source", category: "Publishing" },
  { slug: "substack", name: "Substack", kind: "source", category: "Newsletter" },
  { slug: "mailchimp", name: "Mailchimp", kind: "source", category: "Email" },
  { slug: "medium", name: "Medium", kind: "source", category: "Publishing" },
  { slug: "shopify", name: "Shopify", kind: "source", category: "Commerce" },
  { slug: "notion", name: "Notion", kind: "source", category: "Data" },
  { slug: "ghost", name: "Ghost", kind: "target", category: "Publishing" },
  { slug: "astro", name: "Astro", kind: "target", category: "Website" },
  { slug: "nextjs", name: "Next.js", kind: "target", category: "Website" },
  { slug: "buttondown", name: "Buttondown", kind: "target", category: "Newsletter" },
  { slug: "custom-domain", name: "Custom domain", kind: "target", category: "Identity" },
  { slug: "medusa", name: "Medusa", kind: "target", category: "Commerce" },
  { slug: "git-forge", name: "Self-hosted Git forge", kind: "target", category: "Code" },
];

const MATRIX: Array<{ source: string; target: string; matrixStatus: "live" | "planned"; guide?: string }> = [
  { source: "squarespace", target: "ghost", matrixStatus: "live", guide: "squarespace-to-ghost" },
  { source: "substack", target: "buttondown", matrixStatus: "live", guide: "substack-to-buttondown" },
  { source: "shopify", target: "medusa", matrixStatus: "live", guide: "shopify-to-medusa" },
  { source: "notion", target: "astro", matrixStatus: "live", guide: "notion-to-astro" },
  { source: "wix", target: "nextjs", matrixStatus: "planned" },
  { source: "medium", target: "ghost", matrixStatus: "planned" },
  { source: "mailchimp", target: "buttondown", matrixStatus: "planned" },
];

type ResourceSeed = {
  slug: string;
  title: string;
  data: {
    url?: string;
    resource_type: "docs" | "article" | "video" | "forum_thread" | "tool" | "interactive";
    source_name: string;
    summary: string;
    platforms?: string[];
    is_public?: boolean;
    internal_notes?: string;
    internal_route?: string;
    category?: string;
  };
};

const RESOURCES: ResourceSeed[] = [
  {
    slug: "ghost-import-docs",
    title: "Ghost import documentation",
    data: { url: "https://ghost.org/docs/migration/", resource_type: "docs", source_name: "Ghost", summary: "Official reference for importing content into Ghost.", platforms: ["ghost", "squarespace"], category: "own-your-stack" },
  },
  {
    slug: "keep-your-seo-when-migrating",
    title: "Keep your SEO when you migrate",
    data: { url: "https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes", resource_type: "article", source_name: "Google Search Central", summary: "How 301 redirects preserve rankings during a site move.", platforms: [], category: "own-your-domain" },
  },
  {
    slug: "buttondown-import-video",
    title: "Importing subscribers to Buttondown",
    data: { url: "https://www.youtube.com/watch?v=demo", resource_type: "video", source_name: "Buttondown", summary: "A short walkthrough of the subscriber import flow.", platforms: ["buttondown", "substack"], category: "own-your-audience" },
  },
  {
    slug: "medusa-vs-shopify-thread",
    title: "Medusa vs Shopify — the honest thread",
    data: { url: "https://news.ycombinator.com/item?id=00000000", resource_type: "forum_thread", source_name: "Hacker News", summary: "A candid discussion of the tradeoffs of self-hosting a store.", platforms: ["medusa", "shopify"], category: "own-your-money" },
  },
  {
    slug: "dns-checker",
    title: "DNS propagation checker",
    data: { url: "https://dnschecker.org", resource_type: "tool", source_name: "DNSChecker", summary: "Confirm your domain's records have propagated worldwide.", platforms: ["custom-domain"], category: "own-your-domain" },
  },
  {
    slug: "astro-content-collections",
    title: "Astro content collections",
    data: { url: "https://docs.astro.build/en/guides/content-collections/", resource_type: "docs", source_name: "Astro", summary: "Type-safe content in Astro — the target for Notion migrations.", platforms: ["astro", "notion"], category: "own-your-stack" },
  },
  {
    slug: "self-host-git",
    title: "Self-hosting a Git forge",
    data: { url: "https://forgejo.org/docs/latest/", resource_type: "docs", source_name: "Forgejo", summary: "Run your own Git server so your code lives where you do.", platforms: ["git-forge"], category: "own-your-code" },
  },
  {
    slug: "stripe-checkout-guide",
    title: "Stripe Checkout, from scratch",
    data: { url: "https://stripe.com/docs/checkout/quickstart", resource_type: "docs", source_name: "Stripe", summary: "Take your first payment without a hosted store platform.", platforms: ["medusa"], category: "own-your-money" },
  },
  {
    slug: "backups-that-actually-restore",
    title: "Backups that actually restore",
    data: { url: "https://example.com/backups", resource_type: "article", source_name: "Tan Ho Studio", summary: "A backup you've never restored is a hope, not a backup.", platforms: [], category: "own-your-data" },
  },
  {
    // Internal-only resource — never renders publicly.
    slug: "client-migration-runbook",
    title: "Client migration runbook (internal)",
    data: { resource_type: "docs", source_name: "Tan Ho Studio", summary: "Step-by-step runbook I follow on paid migrations.", is_public: false, internal_notes: "Contains client-specific SSH and registrar notes — never publish. Review before every engagement.", category: "own-your-stack" },
  },
  {
    // Interactive resource — links the in-app quiz.
    slug: "migration-readiness-quiz",
    title: "Are you ready to migrate? (quiz)",
    data: { resource_type: "interactive", source_name: "Tan Ho Studio", summary: "Six questions that tell you whether to migrate now, start small, or prep first.", internal_route: "/quiz", category: "own-your-stack" },
  },
];

export async function seedDemoGuidesTaxonomy(db: SeedDb): Promise<void> {
  // Make the demo taxonomy authoritative: drop neutral-seeded generic rows.
  await reconcileTaxonomy(db, "platform", PLATFORMS.map((p) => p.slug));
  await reconcileTaxonomy(db, "matrix_pair", MATRIX.map((m) => `${m.source}--${m.target}`));
  await reconcileTaxonomy(db, "hub", HUBS.map((h) => h.slug));

  let order = 0;
  for (const h of HUBS) {
    await upsertEntry(db, "hub", h.slug, h.title, { tagline: h.tagline }, { sortOrder: order++ });
  }
  order = 0;
  for (const p of PLATFORMS) {
    await upsertEntry(db, "platform", p.slug, p.name, { name: p.name, kind: p.kind, category: p.category }, { sortOrder: order++ });
  }
  order = 0;
  for (const m of MATRIX) {
    await upsertEntry(
      db,
      "matrix_pair",
      `${m.source}--${m.target}`,
      `${m.source} → ${m.target}`,
      { source: m.source, target: m.target, matrixStatus: m.matrixStatus, guide: m.guide ?? "" },
      { sortOrder: order++ },
    );
  }
  order = 0;
  for (const r of RESOURCES) {
    await upsertEntry(db, "resource", r.slug, r.title, r.data, { sortOrder: order++ });
  }
  log(`demo guides taxonomy seeded: ${HUBS.length} hubs, ${PLATFORMS.length} platforms, ${MATRIX.length} pairs, ${RESOURCES.length} resources`);
}
