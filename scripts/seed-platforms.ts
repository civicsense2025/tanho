import "dotenv/config";
import {
  upsertPlatform, upsertTag, createResource, setResourcePlatforms,
  createGuide, upsertSteps, setGuideTags, setGuideResources, listPlatforms, listTags,
} from "../src/lib/db";

async function main() {
  // Platforms
  const platforms: Array<Parameters<typeof upsertPlatform>[0]> = [
    { slug: "squarespace", name: "Squarespace", kind: "source", category: "website-builder", logo_url: null, description: "Hosted drag-and-drop website builder.", sort_order: 0 },
    { slug: "webflow", name: "Webflow", kind: "source", category: "website-builder", logo_url: null, description: "Hosted visual web design tool.", sort_order: 1 },
    { slug: "wix", name: "Wix", kind: "source", category: "website-builder", logo_url: null, description: "Hosted drag-and-drop website builder.", sort_order: 2 },
    { slug: "shopify", name: "Shopify", kind: "source", category: "ecommerce", logo_url: null, description: "Hosted ecommerce platform.", sort_order: 3 },
    { slug: "saas-database", name: "Notion / Airtable-style SaaS DB", kind: "source", category: "saas", logo_url: null, description: "Hosted no-code database / workspace tools.", sort_order: 4 },
    { slug: "ghost-self-hosted", name: "Ghost (self-hosted)", kind: "target", category: "cms", logo_url: null, description: "Self-hosted publishing platform.", sort_order: 5 },
    { slug: "wordpress-self-hosted", name: "WordPress (self-hosted)", kind: "target", category: "cms", logo_url: null, description: "Self-hosted CMS.", sort_order: 6 },
    { slug: "shopware-ce", name: "Shopware Community Edition", kind: "target", category: "ecommerce", logo_url: null, description: "Open-source, self-hosted ecommerce platform.", sort_order: 7 },
    { slug: "self-hosted-builder", name: "Self-hosted drag-and-drop builder", kind: "target", category: "website-builder", logo_url: null, description: "Open-source visual site builders you run yourself.", sort_order: 8 },
    { slug: "turso", name: "Turso (self-hosted libSQL)", kind: "target", category: "db", logo_url: null, description: "Self-hostable SQLite-compatible database.", sort_order: 9 },
  ];
  for (const p of platforms) await upsertPlatform(p);

  // Tags
  const tagDefs = [
    { slug: "ecommerce", name: "Ecommerce" },
    { slug: "no-code-friendly", name: "No-code friendly" },
    { slug: "requires-cli", name: "Requires CLI" },
    { slug: "data-export-heavy", name: "Data export heavy" },
    { slug: "blogging", name: "Blogging" },
    { slug: "database", name: "Database" },
  ];
  const tags: Record<string, number> = {};
  for (const t of tagDefs) tags[t.slug] = (await upsertTag(t)).id;

  const platformList = await listPlatforms();
  const platformId = (slug: string) => platformList.find((p) => p.slug === slug)!.id;

  // Resources (research corpus)
  const resourceDefs = [
    { title: "Migrating from Squarespace — Ghost Docs", url: "https://ghost.org/docs/migration/squarespace/", source_name: "Ghost", summary: "Official guide for exporting Squarespace content and importing it into Ghost.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["squarespace", "ghost-self-hosted"] },
    { title: "Squarespace CSV/content export gotchas", url: "https://forum.squarespace.com/topic/export-content", source_name: "Squarespace Forum", summary: "Community thread covering common pitfalls when exporting Squarespace content.", resource_type: "forum_thread" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["squarespace"] },
    { title: "Initial Server Setup Guide", url: "https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu", source_name: "DigitalOcean Community", summary: "General-purpose guide to securing and configuring a fresh VPS, useful before any self-hosting migration.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["ghost-self-hosted", "wordpress-self-hosted", "shopware-ce", "self-hosted-builder", "turso"] },
    { title: "Self-hosting Ghost with Docker", url: "https://www.youtube.com/results?search_query=self+hosting+ghost+docker", source_name: "YouTube", summary: "Video walkthrough of running Ghost in Docker on your own server.", resource_type: "video" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["ghost-self-hosted"] },
    { title: "Export your content — WordPress.com", url: "https://wordpress.com/support/export/", source_name: "WordPress.com", summary: "Official export documentation for moving WordPress.com content elsewhere.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["wordpress-self-hosted"] },
    { title: "Webflow data export documentation", url: "https://university.webflow.com/lesson/export-code", source_name: "Webflow University", summary: "Official docs on exporting Webflow site code and CMS content.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["webflow"] },
    { title: "Shopware Community Edition installation guide", url: "https://developer.shopware.com/docs/guides/installation/", source_name: "Shopware Developer Docs", summary: "Official install docs for self-hosting Shopware CE.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["shopware-ce"] },
    { title: "Cost of ownership: Squarespace vs. self-hosted Ghost", url: "https://example.com/cost-comparison-squarespace-ghost", source_name: "Independent blog", summary: "A side-by-side comparison of recurring costs for hosted vs. self-hosted publishing.", resource_type: "article" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["squarespace", "ghost-self-hosted"] },
    { title: "libSQL / Turso self-hosting docs", url: "https://docs.turso.tech/libsql", source_name: "Turso", summary: "Documentation for running your own libSQL server instead of using Turso's hosted offering.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["turso", "saas-database"] },
    { title: "Competitor teardown: hosted-platform migration funnels", url: "https://example.com/internal-competitor-teardown", source_name: "Internal research", summary: "Notes from reviewing how competing migration-guide sites structure their funnels.", resource_type: "article" as const, internal_notes: "Paywalled source, for internal reference only — do not link publicly.", is_public: 0, status: "draft" as const, platforms: [] },
  ];

  const resourceIds: Record<string, number> = {};
  for (const r of resourceDefs) {
    const { platforms: platformSlugs, ...data } = r;
    const resource = await createResource(data);
    resourceIds[r.title] = resource.id;
    if (platformSlugs.length) await setResourcePlatforms(resource.id, platformSlugs.map(platformId));
  }

  // Guides
  const guide1 = await createGuide({
    slug: "squarespace-to-ghost", title: "Migrate from Squarespace to self-hosted Ghost",
    tagline: "Move your site and content to a Ghost instance you run yourself.",
    summary: "<p>This guide walks through exporting your Squarespace content, setting up a VPS, and importing everything into a self-hosted Ghost installation.</p>",
    source_platform: "squarespace", target_platform: "ghost-self-hosted", difficulty: "beginner",
    effort_hours_min: 4, effort_hours_max: 8, cost_min_usd: 5, cost_max_usd: 20, cost_period: "monthly",
    skills_required: JSON.stringify(["Basic terminal use", "DNS management"]),
    requirements: JSON.stringify(["A domain name", "A VPS or cloud server account", "Squarespace export access"]),
    cover_image: null, status: "published", sort_order: 0,
  });
  await upsertSteps(guide1.id, [
    { title: "Export your Squarespace content", type: "text", content: JSON.stringify({ html: "<p>Use Squarespace's built-in export tool to download your pages and blog posts as a WordPress-compatible XML file.</p>" }), sort_order: 0 },
    { title: "Back up before you start", type: "callout", content: JSON.stringify({ variant: "warning", html: "<p>Always keep a copy of your Squarespace export before making changes — you can re-export but it's easier to have it on hand.</p>" }), sort_order: 1 },
    { title: "Provision a server", type: "code", content: JSON.stringify({ language: "bash", filename: "", code: "ssh root@your-server-ip\napt update && apt upgrade -y" }), sort_order: 2 },
    { title: "Pre-flight checklist", type: "checklist", content: JSON.stringify({ items: ["Domain DNS points to new server", "Server has Docker installed", "Ghost CLI or Docker image ready", "Squarespace export downloaded"] }), sort_order: 3 },
  ]);
  await setGuideTags(guide1.id, [tags["blogging"], tags["data-export-heavy"]]);
  await setGuideResources(guide1.id, [resourceIds["Migrating from Squarespace — Ghost Docs"], resourceIds["Squarespace CSV/content export gotchas"], resourceIds["Initial Server Setup Guide"], resourceIds["Self-hosting Ghost with Docker"], resourceIds["Cost of ownership: Squarespace vs. self-hosted Ghost"]]);

  const guide2 = await createGuide({
    slug: "webflow-to-wordpress", title: "Migrate from Webflow to self-hosted WordPress",
    tagline: "Export your Webflow design and rebuild it on a WordPress site you control.",
    summary: "<p>Webflow's visual builder doesn't map directly onto WordPress, so this guide covers exporting code, choosing a WordPress theme strategy, and migrating CMS content.</p>",
    source_platform: "webflow", target_platform: "wordpress-self-hosted", difficulty: "intermediate",
    effort_hours_min: 10, effort_hours_max: 25, cost_min_usd: 10, cost_max_usd: 40, cost_period: "monthly",
    skills_required: JSON.stringify(["HTML/CSS basics", "WordPress theme setup", "Basic terminal use"]),
    requirements: JSON.stringify(["A domain name", "A VPS or managed WordPress host", "Webflow code export (paid plan)"]),
    cover_image: null, status: "published", sort_order: 1,
  });
  await upsertSteps(guide2.id, [
    { title: "Export your Webflow site code", type: "text", content: JSON.stringify({ html: "<p>Use Webflow's code export feature to download your site's HTML, CSS, and JS.</p>" }), sort_order: 0 },
    { title: "Export CMS content separately", type: "text", content: JSON.stringify({ html: "<p>Webflow CMS collections export as CSV — plan to re-import these into WordPress custom post types.</p>" }), sort_order: 1 },
    { title: "Install WordPress on your server", type: "code", content: JSON.stringify({ language: "bash", filename: "", code: "wp core download\nwp config create --dbname=wordpress --dbuser=wp_user" }), sort_order: 2 },
  ]);
  await setGuideTags(guide2.id, [tags["no-code-friendly"], tags["data-export-heavy"]]);
  await setGuideResources(guide2.id, [resourceIds["Webflow data export documentation"], resourceIds["Export your content — WordPress.com"], resourceIds["Initial Server Setup Guide"]]);

  const guide3 = await createGuide({
    slug: "shopify-to-shopware", title: "Migrate from Shopify to Shopware Community Edition",
    tagline: "Move your store, products, and customer data to a self-hosted Shopware instance.",
    summary: "<p>This is the highest-stakes migration in this collection — it covers inventory, payments, and customer data, so plan for thorough testing before cutover.</p>",
    source_platform: "shopify", target_platform: "shopware-ce", difficulty: "advanced",
    effort_hours_min: 30, effort_hours_max: 80, cost_min_usd: 30, cost_max_usd: 150, cost_period: "monthly",
    skills_required: JSON.stringify(["Server administration", "PHP/Symfony basics", "Payment gateway configuration", "Database migration"]),
    requirements: JSON.stringify(["A domain name", "A capable VPS (4GB+ RAM)", "PCI-compliant payment processor", "Full product/order data export"]),
    cover_image: null, status: "published", sort_order: 2,
  });
  await upsertSteps(guide3.id, [
    { title: "Export products, customers, and orders", type: "text", content: JSON.stringify({ html: "<p>Use Shopify's bulk export tools to download CSVs of products, customers, and historical orders.</p>" }), sort_order: 0 },
    { title: "Don't cut over without testing", type: "callout", content: JSON.stringify({ variant: "danger", html: "<p>Run your new store in parallel and test checkout end-to-end with real payment methods before pointing your domain at it.</p>" }), sort_order: 1 },
    { title: "Install Shopware CE", type: "code", content: JSON.stringify({ language: "bash", filename: "", code: "composer create-project shopware/production" }), sort_order: 2 },
  ]);
  await setGuideTags(guide3.id, [tags["ecommerce"], tags["requires-cli"], tags["data-export-heavy"]]);
  await setGuideResources(guide3.id, [resourceIds["Shopware Community Edition installation guide"], resourceIds["Initial Server Setup Guide"]]);

  const guide4 = await createGuide({
    slug: "wix-to-self-hosted-builder", title: "Migrate from Wix to a self-hosted drag-and-drop builder",
    tagline: "Keep the no-code editing experience you like, without the platform lock-in.",
    summary: "<p>For Wix users who want to keep a visual, drag-and-drop workflow but host it themselves, this guide walks through picking and setting up an open-source builder.</p>",
    source_platform: "wix", target_platform: "self-hosted-builder", difficulty: "beginner",
    effort_hours_min: 3, effort_hours_max: 6, cost_min_usd: 5, cost_max_usd: 15, cost_period: "monthly",
    skills_required: JSON.stringify(["Basic terminal use"]),
    requirements: JSON.stringify(["A domain name", "A small VPS"]),
    cover_image: null, status: "published", sort_order: 3,
  });
  await upsertSteps(guide4.id, [
    { title: "Recreate your page structure", type: "text", content: JSON.stringify({ html: "<p>Wix doesn't offer a clean code export, so plan to manually recreate your pages in the new builder using screenshots as reference.</p>" }), sort_order: 0 },
    { title: "What you'll need", type: "checklist", content: JSON.stringify({ items: ["Domain registrar access", "List of pages and content to recreate", "Exported images and media"] }), sort_order: 1 },
  ]);
  await setGuideTags(guide4.id, [tags["no-code-friendly"]]);

  const guide5 = await createGuide({
    slug: "saas-database-to-turso", title: "Migrate from a SaaS database tool to self-hosted Turso",
    tagline: "Move structured data out of a hosted SaaS database into a database you control.",
    summary: "<p>For teams using Notion/Airtable-style tools as a lightweight database, this guide covers exporting structured data and standing up a self-hosted libSQL/Turso instance.</p>",
    source_platform: "saas-database", target_platform: "turso", difficulty: "intermediate",
    effort_hours_min: 8, effort_hours_max: 20, cost_min_usd: 10, cost_max_usd: 35, cost_period: "monthly",
    skills_required: JSON.stringify(["SQL basics", "Basic terminal use", "API/scripting for data import"]),
    requirements: JSON.stringify(["A VPS or container host", "Exported CSV/JSON data from your current tool"]),
    cover_image: null, status: "published", sort_order: 4,
  });
  await upsertSteps(guide5.id, [
    { title: "Export your structured data", type: "text", content: JSON.stringify({ html: "<p>Export each table/view as CSV or JSON from your current SaaS tool.</p>" }), sort_order: 0 },
    { title: "Run your own libSQL server", type: "code", content: JSON.stringify({ language: "bash", filename: "", code: "docker run -p 8080:8080 ghcr.io/tursodatabase/libsql-server:latest" }), sort_order: 1 },
  ]);
  await setGuideTags(guide5.id, [tags["database"], tags["requires-cli"], tags["data-export-heavy"]]);
  await setGuideResources(guide5.id, [resourceIds["libSQL / Turso self-hosting docs"]]);

  const tagNames = (await listTags()).map((t) => t.name).join(", ");
  console.log(`Seeded ${platforms.length} platforms, ${tagDefs.length} tags (${tagNames}), ${resourceDefs.length} resources, 5 guides.`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
