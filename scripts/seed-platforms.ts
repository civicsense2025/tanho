import "dotenv/config";
import {
  upsertPlatform, upsertTag, createResource, updateResource, setResourcePlatforms,
  createGuide, updateGuide, getGuide, upsertSteps, setGuideTags, setGuideResources,
  listPlatforms, listTags, listResources,
} from "../src/lib/db";

async function main() {
  // ---------- Platforms (all real, web-verified) ----------
  const platforms: Array<Parameters<typeof upsertPlatform>[0]> = [
    // Hosted / source — website builders
    { slug: "squarespace", name: "Squarespace", kind: "source", category: "website-builder", logo_url: null, description: "Hosted drag-and-drop website builder.", sort_order: 0, official_url: "https://www.squarespace.com", is_open_source: 0, pricing_model: "paid_saas", pricing_notes: "Paid plans, no self-hosting option.", github_url: null },
    { slug: "webflow", name: "Webflow", kind: "source", category: "website-builder", logo_url: null, description: "Hosted visual web design tool. Code export available on paid plans, but CMS/Ecommerce content is not included in the export.", sort_order: 1, official_url: "https://webflow.com", is_open_source: 0, pricing_model: "paid_saas", pricing_notes: "Paid plans required for code export.", github_url: null },
    { slug: "wix", name: "Wix", kind: "source", category: "website-builder", logo_url: null, description: "Hosted drag-and-drop website builder. No clean code export.", sort_order: 2, official_url: "https://www.wix.com", is_open_source: 0, pricing_model: "paid_saas", pricing_notes: "Paid plans, no self-hosting option.", github_url: null },
    // Hosted / source — ecommerce
    { slug: "shopify", name: "Shopify", kind: "source", category: "ecommerce", logo_url: null, description: "Hosted ecommerce platform.", sort_order: 3, official_url: "https://www.shopify.com", is_open_source: 0, pricing_model: "paid_saas", pricing_notes: "Paid plans plus transaction fees.", github_url: null },
    // Hosted / source — CMS
    { slug: "wordpress-com", name: "WordPress.com", kind: "source", category: "cms", logo_url: null, description: "Managed, hosted version of WordPress.", sort_order: 4, official_url: "https://wordpress.com", is_open_source: 0, pricing_model: "freemium", pricing_notes: "Free tier available, paid plans for custom domains/plugins.", github_url: null },
    // Hosted / source — SaaS workspace tools
    { slug: "saas-database", name: "Notion / Airtable-style SaaS DB", kind: "source", category: "saas", logo_url: null, description: "Generic category for hosted no-code database / workspace tools.", sort_order: 5, official_url: null, is_open_source: 0, pricing_model: "freemium", pricing_notes: null, github_url: null },
    { slug: "notion", name: "Notion", kind: "source", category: "saas", logo_url: null, description: "Hosted workspace/notes/database tool. Exports as HTML, Markdown, or CSV per the official export feature.", sort_order: 6, official_url: "https://www.notion.com", is_open_source: 0, pricing_model: "freemium", pricing_notes: "Free tier, paid plans for teams.", github_url: null },
    { slug: "airtable", name: "Airtable", kind: "source", category: "saas", logo_url: null, description: "Hosted spreadsheet-database hybrid tool.", sort_order: 7, official_url: "https://www.airtable.com", is_open_source: 0, pricing_model: "freemium", pricing_notes: "Free tier, paid plans for teams.", github_url: null },
    { slug: "linear", name: "Linear", kind: "source", category: "project-mgmt", logo_url: null, description: "Hosted issue tracking and project management tool. Linear has no self-hosted offering — it is pure SaaS. See Plane and Huly for self-hostable alternatives.", sort_order: 8, official_url: "https://linear.app", is_open_source: 0, pricing_model: "paid_saas", pricing_notes: "Per-seat SaaS pricing, no self-host option.", github_url: null },

    // Self-hosted / target — CMS & blogging
    { slug: "ghost-self-hosted", name: "Ghost (self-hosted)", kind: "target", category: "cms", logo_url: null, description: "Self-hosted publishing platform, MIT licensed.", sort_order: 9, official_url: "https://ghost.org", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free core; ~$5–20/mo VPS, Ghost's own docs estimate ~$72/mo for a fully-loaded setup with CDN/analytics/email.", github_url: "https://github.com/TryGhost/Ghost" },
    { slug: "wordpress-self-hosted", name: "WordPress (self-hosted)", kind: "target", category: "cms", logo_url: null, description: "Self-hosted CMS, GPL licensed.", sort_order: 10, official_url: "https://wordpress.org", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free core; cost is hosting + plugins/themes.", github_url: "https://github.com/WordPress/WordPress" },
    // Self-hosted / target — website builders
    { slug: "webstudio", name: "Webstudio", kind: "target", category: "website-builder", logo_url: null, description: "Open-source visual website builder, closest self-hosted equivalent to Webflow. Self-hosts via Docker Compose with PostgreSQL.", sort_order: 11, official_url: "https://webstudio.is", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free self-hosted; managed cloud also available.", github_url: "https://github.com/webstudio-is/webstudio" },
    { slug: "self-hosted-builder", name: "Self-hosted drag-and-drop builder (general)", kind: "target", category: "website-builder", logo_url: null, description: "Generic category for open-source visual site builders you run yourself (e.g. Webstudio).", sort_order: 12, official_url: null, is_open_source: 1, pricing_model: "free_oss", pricing_notes: null, github_url: null },
    // Self-hosted / target — ecommerce
    { slug: "shopware-ce", name: "Shopware Community Edition", kind: "target", category: "ecommerce", logo_url: null, description: "Open-source, self-hosted ecommerce platform built on Symfony.", sort_order: 13, official_url: "https://www.shopware.com", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free core; needs a capable VPS (4GB+ RAM).", github_url: "https://github.com/shopware/shopware" },
    { slug: "medusa", name: "Medusa.js", kind: "target", category: "ecommerce", logo_url: null, description: "Open-source headless commerce engine built in Node.js/TypeScript.", sort_order: 14, official_url: "https://medusajs.com", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free core; pairs with a separate storefront (e.g. Next.js).", github_url: "https://github.com/medusajs/medusa" },
    { slug: "saleor", name: "Saleor", kind: "target", category: "ecommerce", logo_url: null, description: "Open-source, GraphQL-first headless commerce platform built on Python/Django.", sort_order: 15, official_url: "https://saleor.io", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free core; managed cloud also available.", github_url: "https://github.com/saleor/saleor" },
    // Self-hosted / target — structured data / Airtable & Notion alternatives
    { slug: "nocodb", name: "NocoDB", kind: "target", category: "database", logo_url: null, description: "Self-hostable Airtable-style spreadsheet UI that wraps an existing MySQL/Postgres/SQLite database. As of v0.301.0, licensed under the Sustainable Use License rather than pure OSS.", sort_order: 16, official_url: "https://nocodb.com", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free self-hosted (Sustainable Use License); lighter resource footprint than Baserow.", github_url: "https://github.com/nocodb/nocodb" },
    { slug: "baserow", name: "Baserow", kind: "target", category: "database", logo_url: null, description: "MIT-licensed, self-hostable no-code database and application builder — fuller Airtable/Notion-style alternative than NocoDB.", sort_order: 17, official_url: "https://baserow.io", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free self-hosted (MIT); heavier stack (Django + Postgres + Redis).", github_url: "https://gitlab.com/baserow/baserow" },
    { slug: "directus", name: "Directus", kind: "target", category: "database", logo_url: null, description: "Open-source, database-first headless CMS/data platform that wraps an existing SQL database with instant REST + GraphQL APIs and an admin UI.", sort_order: 18, official_url: "https://directus.io", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free self-hosted; managed cloud also available.", github_url: "https://github.com/directus/directus" },
    { slug: "strapi", name: "Strapi", kind: "target", category: "database", logo_url: null, description: "Open-source headless CMS, largest plugin ecosystem of the major self-hosted options (~70k GitHub stars).", sort_order: 19, official_url: "https://strapi.io", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free self-hosted; managed cloud also available.", github_url: "https://github.com/strapi/strapi" },
    { slug: "payload-cms", name: "Payload CMS", kind: "target", category: "database", logo_url: null, description: "Open-source, TypeScript code-first headless CMS.", sort_order: 20, official_url: "https://payloadcms.com", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free self-hosted; managed cloud also available.", github_url: "https://github.com/payloadcms/payload" },
    // Self-hosted / target — project management (Linear alternatives)
    { slug: "plane", name: "Plane", kind: "target", category: "project-mgmt", logo_url: null, description: "Open-source project management tool that mirrors Linear's UX (issues, cycles, modules, pages). Free to self-host.", sort_order: 21, official_url: "https://plane.so", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free self-hosted; cloud Pro tier ~$6/seat/mo.", github_url: "https://github.com/makeplane/plane" },
    { slug: "huly", name: "Huly", kind: "target", category: "project-mgmt", logo_url: null, description: "Open-source, self-hostable platform combining issue tracking, docs, and chat — positioned as a Linear + Notion + Slack replacement.", sort_order: 22, official_url: "https://huly.io", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free self-hosted; per-workspace cloud pricing.", github_url: "https://github.com/hcengineering/huly-selfhost" },
    // Self-hosted / target — database
    { slug: "turso", name: "Turso (self-hosted libSQL)", kind: "target", category: "database", logo_url: null, description: "Self-hostable SQLite-compatible database server (sqld), the open-source core behind Turso's hosted offering.", sort_order: 23, official_url: "https://turso.tech", is_open_source: 1, pricing_model: "free_oss", pricing_notes: "Free self-hosted via Docker; Turso's managed service is the paid alternative.", github_url: "https://github.com/tursodatabase/libsql" },

    // Infrastructure / hosting providers
    { slug: "hetzner", name: "Hetzner Cloud", kind: "target", category: "hosting", logo_url: null, description: "VPS provider, cheapest of the major options with generous bundled bandwidth. EU-centric infrastructure.", sort_order: 24, official_url: "https://www.hetzner.com/cloud", is_open_source: 0, pricing_model: "usage_based", pricing_notes: "CX32 (4 vCPU/8GB) ~$7.59/mo, 20TB bandwidth included. Raised prices 30–37% in April 2026 due to DRAM costs.", github_url: null },
    { slug: "digitalocean", name: "DigitalOcean", kind: "target", category: "hosting", logo_url: null, description: "VPS provider with a broader managed-services platform (databases, App Platform, CDN) and widely-used documentation.", sort_order: 25, official_url: "https://www.digitalocean.com", is_open_source: 0, pricing_model: "usage_based", pricing_notes: "Basic Droplet from $24/mo for a comparable spec to Hetzner's CX32.", github_url: null },
    { slug: "vultr", name: "Vultr", kind: "target", category: "hosting", logo_url: null, description: "VPS provider positioned between raw infrastructure (Hetzner) and managed platforms (DigitalOcean) — 32+ regions, API-first.", sort_order: 26, official_url: "https://www.vultr.com", is_open_source: 0, pricing_model: "usage_based", pricing_notes: "Competitive hourly/monthly billing across many regions.", github_url: null },
  ];
  for (const p of platforms) await upsertPlatform(p);

  // ---------- Tags ----------
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

  // ---------- Resources (research corpus — all real, web-verified URLs) ----------
  const resourceDefs = [
    { title: "Migrating from Squarespace — Ghost Docs", url: "https://ghost.org/docs/migration/squarespace/", source_name: "Ghost", summary: "Official guide to the built-in Squarespace migrator in Ghost Admin (Settings → Advanced → Import/Export).", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["squarespace", "ghost-self-hosted"] },
    { title: "How do I export my Webflow site code? — Webflow Help Center", url: "https://help.webflow.com/hc/en-us/articles/33961386739347-How-do-I-export-my-Webflow-site-code", source_name: "Webflow", summary: "Official docs on code export. Confirms CMS/Ecommerce/User Account content is NOT included in the code export — only available as a separate CSV.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["webflow"] },
    { title: "Export WordPress Content — WordPress.com Support", url: "https://wordpress.com/support/export/", source_name: "WordPress.com", summary: "Official export documentation: Tools → Export, choose all content or specific types, downloads as XML.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["wordpress-com", "wordpress-self-hosted"] },
    { title: "Exporting products — Shopify Help Center", url: "https://help.shopify.com/en/manual/products/import-export/export-products", source_name: "Shopify", summary: "Official docs on exporting your product catalog as CSV (note: product images are not included in the export).", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["shopify"] },
    { title: "Exporting orders — Shopify Help Center", url: "https://help.shopify.com/en/manual/fulfillment/managing-orders/exporting-orders", source_name: "Shopify", summary: "Official docs on exporting order history as CSV from the Shopify admin.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["shopify"] },
    { title: "Export your content — Notion Help Center", url: "https://www.notion.com/help/export-your-content", source_name: "Notion", summary: "Official docs on exporting an entire workspace as HTML, Markdown, or CSV (databases), including uploaded files.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["notion", "saas-database"] },
    { title: "Installing Shopware 6 — Shopware Docs", url: "https://docs.shopware.com/en/shopware-6-en/first-steps/installing-shopware-6", source_name: "Shopware", summary: "Official first-steps installation guide for self-hosting Shopware 6.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["shopware-ce"] },
    { title: "Shopware 6 Community Edition installation guide (developer docs)", url: "https://developer.shopware.com/docs/guides/installation/", source_name: "Shopware Developer Docs", summary: "Developer-focused install guide; Docker is the officially recommended setup.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["shopware-ce"] },
    { title: "libSQL — Turso Docs", url: "https://docs.turso.tech/libsql", source_name: "Turso", summary: "Documentation for libSQL, the open-source SQLite fork behind Turso, including the self-hosted sqld server.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["turso", "saas-database"] },
    { title: "Initial Server Setup with Ubuntu — DigitalOcean Community", url: "https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu", source_name: "DigitalOcean Community", summary: "General-purpose guide to securing a fresh VPS (user accounts, SSH keys, firewall). Validated for Ubuntu 22.04/24.04/24.10.", resource_type: "docs" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["ghost-self-hosted", "wordpress-self-hosted", "shopware-ce", "self-hosted-builder", "turso", "hetzner", "digitalocean", "vultr"] },
    { title: "DigitalOcean vs. Hetzner Cloud: a side-by-side comparison", url: "https://betterstack.com/community/guides/web-servers/digitalocean-vs-hetzner/", source_name: "Better Stack", summary: "Independent technical comparison of pricing, performance, and platform breadth between the two VPS providers.", resource_type: "article" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["hetzner", "digitalocean"] },
    { title: "Huly self-hosting guide", url: "https://betterstack.com/community/guides/linux/huly/", source_name: "Better Stack", summary: "Independent walkthrough of self-hosting Huly as a Linear/Notion/Slack alternative.", resource_type: "article" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["huly", "linear"] },
    { title: "Plane vs Linear", url: "https://plane.so/plane-vs-linear", source_name: "Plane", summary: "Official feature/pricing comparison from the Plane team.", resource_type: "article" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["plane", "linear"] },
    { title: "NocoDB vs Baserow: Which Open-Source Airtable Alternative Should You Pick?", url: "https://blog.elest.io/nocodb-vs-baserow-which-open-source-airtable-alternative-should-you-pick/", source_name: "elest.io", summary: "Independent comparison of licensing, resource footprint, and feature depth between NocoDB and Baserow.", resource_type: "article" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["nocodb", "baserow", "airtable"] },
    { title: "Strapi vs Directus vs Payload: Headless CMS Showdown", url: "https://www.glukhov.org/post/2025/11/headless-cms-comparison-strapi-directus-payload/", source_name: "Rost Glukhov (independent)", summary: "Technical comparison of the three leading self-hosted headless CMS options.", resource_type: "article" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["strapi", "directus", "payload-cms"] },
    { title: "NocoDB — GitHub", url: "https://github.com/nocodb/nocodb", source_name: "GitHub", summary: "Source repository for NocoDB, the self-hostable Airtable-style spreadsheet UI.", resource_type: "tool" as const, internal_notes: null, is_public: 1, status: "published" as const, platforms: ["nocodb"] },
    { title: "10+ Best Open Source Linear Alternatives", url: "https://openalternative.co/alternatives/linear", source_name: "OpenAlternative", summary: "Roundup of open-source Linear alternatives, used here as internal competitive-research reading rather than a public citation.", resource_type: "article" as const, internal_notes: "Marketing-style roundup; useful for surveying the landscape but not a primary source we want to publicly cite.", is_public: 0, status: "draft" as const, platforms: ["linear"] },
  ];

  const existingResources = await listResources(false);
  const resourceIds: Record<string, number> = {};
  for (const r of resourceDefs) {
    const { platforms: platformSlugs, ...data } = r;
    const existing = existingResources.find((er) => er.url === data.url);
    const resource = existing ? await updateResource(existing.id, data) : await createResource(data);
    resourceIds[r.title] = resource.id;
    if (platformSlugs.length) await setResourcePlatforms(resource.id, platformSlugs.map(platformId));
  }

  // ---------- Guides (idempotent: update if slug exists, else create) ----------
  async function upsertGuide(data: Parameters<typeof createGuide>[0]) {
    const existing = await getGuide(data.slug);
    return existing ? await updateGuide(existing.id, data) : await createGuide(data);
  }

  const guide1 = await upsertGuide({
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
  await setGuideResources(guide1.id, [resourceIds["Migrating from Squarespace — Ghost Docs"], resourceIds["Initial Server Setup with Ubuntu — DigitalOcean Community"]]);

  const guide2 = await upsertGuide({
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
    { title: "Export your Webflow site code", type: "text", content: JSON.stringify({ html: "<p>Use Webflow's code export feature to download your site's HTML, CSS, and JS. Note this does not include CMS, Ecommerce, or User Account content.</p>" }), sort_order: 0 },
    { title: "Export CMS content separately", type: "text", content: JSON.stringify({ html: "<p>Webflow CMS collections export as CSV — plan to re-import these into WordPress custom post types.</p>" }), sort_order: 1 },
    { title: "Install WordPress on your server", type: "code", content: JSON.stringify({ language: "bash", filename: "", code: "wp core download\nwp config create --dbname=wordpress --dbuser=wp_user" }), sort_order: 2 },
  ]);
  await setGuideTags(guide2.id, [tags["no-code-friendly"], tags["data-export-heavy"]]);
  await setGuideResources(guide2.id, [resourceIds["How do I export my Webflow site code? — Webflow Help Center"], resourceIds["Export WordPress Content — WordPress.com Support"], resourceIds["Initial Server Setup with Ubuntu — DigitalOcean Community"]]);

  const guide3 = await upsertGuide({
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
    { title: "Export products, customers, and orders", type: "text", content: JSON.stringify({ html: "<p>Use Shopify's CSV export tools to download your product catalog, customer list, and historical orders.</p>" }), sort_order: 0 },
    { title: "Don't cut over without testing", type: "callout", content: JSON.stringify({ variant: "danger", html: "<p>Run your new store in parallel and test checkout end-to-end with real payment methods before pointing your domain at it.</p>" }), sort_order: 1 },
    { title: "Install Shopware CE", type: "code", content: JSON.stringify({ language: "bash", filename: "", code: "composer create-project shopware/production" }), sort_order: 2 },
  ]);
  await setGuideTags(guide3.id, [tags["ecommerce"], tags["requires-cli"], tags["data-export-heavy"]]);
  await setGuideResources(guide3.id, [resourceIds["Exporting products — Shopify Help Center"], resourceIds["Exporting orders — Shopify Help Center"], resourceIds["Installing Shopware 6 — Shopware Docs"], resourceIds["Shopware 6 Community Edition installation guide (developer docs)"]]);

  const guide4 = await upsertGuide({
    slug: "wix-to-self-hosted-builder", title: "Migrate from Wix to a self-hosted drag-and-drop builder",
    tagline: "Keep the no-code editing experience you like, without the platform lock-in.",
    summary: "<p>For Wix users who want to keep a visual, drag-and-drop workflow but host it themselves, this guide walks through picking and setting up an open-source builder like Webstudio.</p>",
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

  const guide5 = await upsertGuide({
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
    { title: "Export your structured data", type: "text", content: JSON.stringify({ html: "<p>Export each table/view as CSV, Markdown, or HTML from your current SaaS tool.</p>" }), sort_order: 0 },
    { title: "Run your own libSQL server", type: "code", content: JSON.stringify({ language: "bash", filename: "", code: "docker run -p 8080:8080 ghcr.io/tursodatabase/libsql-server:latest" }), sort_order: 1 },
  ]);
  await setGuideTags(guide5.id, [tags["database"], tags["requires-cli"], tags["data-export-heavy"]]);
  await setGuideResources(guide5.id, [resourceIds["Export your content — Notion Help Center"], resourceIds["libSQL — Turso Docs"]]);

  const tagNames = (await listTags()).map((t) => t.name).join(", ");
  console.log(`Seeded ${platforms.length} platforms, ${tagDefs.length} tags (${tagNames}), ${resourceDefs.length} resources, 5 guides.`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
