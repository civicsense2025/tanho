import { upsertEntry } from "./demo-entry-helper";
import { b, rich, type Block } from "./demo-blocks";
import { log, type SeedDb } from "../lib";

/**
 * Demo written guides — the 4 flagship migration guides. Each guide's steps
 * are reproduced as real blocks (richtext/code/callout/list/image) in a
 * block_set under ownerType `entry:guide`. Structured fields (source/target/
 * difficulty/effort/cost/resource_slugs) live in the entry `data`.
 */

type GuideSeed = {
  slug: string;
  title: string;
  data: Record<string, unknown>;
  blocks: Block[];
};

const GUIDES: GuideSeed[] = [
  {
    slug: "squarespace-to-ghost",
    title: "Squarespace to Ghost",
    data: {
      tagline: "Move a Squarespace site to Ghost without losing search rankings.",
      summary: "Export, rebuild your routes, redirect the rest, and go live on a platform you own.",
      category: "own-your-stack",
      source_platform: "squarespace",
      target_platform: "ghost",
      difficulty: "intermediate",
      effort_hours_min: 6,
      effort_hours_max: 16,
      cost_min_usd: 9,
      cost_max_usd: 25,
      cost_period: "mo",
      tags: ["migration", "seo", "publishing"],
      resource_slugs: ["ghost-import-docs", "keep-your-seo-when-migrating", "dns-checker"],
      skills_required: ["Basic DNS", "Comfort editing config files"],
      requirements: ["A Ghost host (or self-host)", "Access to your domain's DNS"],
    },
    blocks: [
      b("heading", { text: "Squarespace → Ghost", level: "h1", align: "left" }),
      rich("<p>Ghost is the closest thing to Squarespace that you can actually own. This guide moves you across in an afternoon of focused work.</p>"),
      b("heading", { text: "1. Export your content", level: "h2", align: "left" }),
      rich("<p>Squarespace exports to a WordPress-format XML file. Ghost imports it natively.</p>"),
      b("callout", { tone: "tip", title: "Do this first", body: "Export before you change anything. It's your safety net if a step goes sideways." }),
      b("heading", { text: "2. Import into Ghost", level: "h2", align: "left" }),
      b("code", { filename: "terminal", language: "bash", code: "# In Ghost Admin → Settings → Labs → Import\n# Upload the Squarespace .xml export, then map authors." }),
      b("heading", { text: "3. Preserve your URLs", level: "h2", align: "left" }),
      b("list", { style: "number", items: ["List every live URL on the old site.", "Recreate those exact slugs in Ghost.", "Add redirects for anything that had to change."] }),
      b("code", { filename: "redirects.yaml", language: "yaml", code: "301:\n  /old-blog-post: /new-blog-post\n  /services-page: /services" }),
      b("callout", { tone: "warning", title: "Redirects are non-negotiable", body: "Skip them and you'll watch your rankings drop for weeks. Map every changed URL." }),
      b("heading", { text: "4. Point your domain", level: "h2", align: "left" }),
      rich("<p>Update your A / CNAME records to Ghost, wait for propagation, and confirm with a DNS checker before you announce anything.</p>"),
    ],
  },
  {
    slug: "substack-to-buttondown",
    title: "Substack to Buttondown",
    data: {
      tagline: "Take your newsletter — and your subscriber list — off Substack.",
      summary: "Export subscribers, import to Buttondown, warm up sending, and keep 100% of your revenue.",
      category: "own-your-audience",
      source_platform: "substack",
      target_platform: "buttondown",
      difficulty: "beginner",
      effort_hours_min: 2,
      effort_hours_max: 5,
      cost_min_usd: 9,
      cost_max_usd: 29,
      cost_period: "mo",
      tags: ["newsletter", "migration", "audience"],
      resource_slugs: ["buttondown-import-video", "keep-your-seo-when-migrating"],
      skills_required: ["None — this one's friendly"],
      requirements: ["A Buttondown account", "Your Substack export"],
    },
    blocks: [
      b("heading", { text: "Substack → Buttondown", level: "h1", align: "left" }),
      rich("<p>Substack is a great place to start and a frustrating place to stay — the 10% cut and the locked-in list add up. Buttondown lets you own both.</p>"),
      b("heading", { text: "1. Export your subscribers", level: "h2", align: "left" }),
      rich("<p>Substack → Settings → Export gives you a CSV of every subscriber, including who's paid.</p>"),
      b("callout", { tone: "info", title: "You own this list", body: "Your subscriber list is yours to take. Any platform that makes this hard is telling you something." }),
      b("heading", { text: "2. Import into Buttondown", level: "h2", align: "left" }),
      b("list", { style: "number", items: ["Upload the CSV in Buttondown's import screen.", "Tag imported subscribers so you can segment later.", "Send a friendly 'we've moved' first issue."] }),
      b("heading", { text: "3. Warm up your sending", level: "h2", align: "left" }),
      rich("<p>Send to your most engaged readers first. It protects your deliverability while your new domain builds a reputation.</p>"),
    ],
  },
  {
    slug: "shopify-to-medusa",
    title: "Shopify to Medusa",
    data: {
      tagline: "Run your own store on Medusa and stop paying per-transaction rent.",
      summary: "Export products and orders, stand up Medusa, wire Stripe, and cut over.",
      category: "own-your-money",
      source_platform: "shopify",
      target_platform: "medusa",
      difficulty: "advanced",
      effort_hours_min: 20,
      effort_hours_max: 60,
      cost_min_usd: 0,
      cost_max_usd: 40,
      cost_period: "mo",
      tags: ["commerce", "migration", "self-host"],
      resource_slugs: ["medusa-vs-shopify-thread", "stripe-checkout-guide"],
      skills_required: ["Node.js", "Basic server ops", "Stripe"],
      requirements: ["A server or PaaS", "A Stripe account", "Your Shopify product/order export"],
    },
    blocks: [
      b("heading", { text: "Shopify → Medusa", level: "h1", align: "left" }),
      rich("<p>This is the hardest migration on the site, and the one that saves the most money at volume. Medusa is an open-source commerce engine you host yourself.</p>"),
      b("callout", { tone: "danger", title: "Not a weekend project", body: "Budget real time. Run the new store in parallel before you cut DNS over." }),
      b("heading", { text: "1. Export from Shopify", level: "h2", align: "left" }),
      rich("<p>Export products, variants, and orders as CSV. Inventory is the number that has to be right — reconcile it twice.</p>"),
      b("heading", { text: "2. Stand up Medusa", level: "h2", align: "left" }),
      b("code", { filename: "terminal", language: "bash", code: "npx create-medusa-app@latest my-store\ncd my-store\nnpm run seed" }),
      b("heading", { text: "3. Wire Stripe", level: "h2", align: "left" }),
      b("code", { filename: ".env", language: "bash", code: "STRIPE_API_KEY=sk_test_...\nSTRIPE_WEBHOOK_SECRET=whsec_..." }),
      b("heading", { text: "4. Cut over", level: "h2", align: "left" }),
      b("list", { style: "check", items: ["Run both stores in parallel for a week.", "Redirect old product URLs to the new ones.", "Only then move your domain."] }),
    ],
  },
  {
    slug: "notion-to-astro",
    title: "Notion to Astro",
    data: {
      tagline: "Turn a Notion site into a fast, ownable Astro site.",
      summary: "Pull content out of Notion, model it as collections, and ship a static site you control.",
      category: "own-your-stack",
      source_platform: "notion",
      target_platform: "astro",
      difficulty: "intermediate",
      effort_hours_min: 8,
      effort_hours_max: 20,
      cost_min_usd: 0,
      cost_max_usd: 0,
      cost_period: "one-time",
      tags: ["migration", "static-site", "content"],
      resource_slugs: ["astro-content-collections", "backups-that-actually-restore"],
      skills_required: ["Basic JavaScript", "Git"],
      requirements: ["Node.js", "A Notion integration token"],
    },
    blocks: [
      b("heading", { text: "Notion → Astro", level: "h1", align: "left" }),
      rich("<p>Notion is a lovely place to write and a fragile place to publish. Astro gives you the same content as a fast static site you own outright.</p>"),
      b("heading", { text: "1. Pull content from Notion", level: "h2", align: "left" }),
      b("code", { filename: "fetch.ts", language: "ts", code: "import { Client } from \"@notionhq/client\";\nconst notion = new Client({ auth: process.env.NOTION_TOKEN });\nconst db = await notion.databases.query({ database_id: DB_ID });" }),
      b("heading", { text: "2. Model it as collections", level: "h2", align: "left" }),
      rich("<p>Map each Notion database to an Astro content collection with a typed schema. Now your content is validated at build time.</p>"),
      b("callout", { tone: "tip", title: "Back it up as you go", body: "Write the fetched Notion content to disk. A backup you've never restored is just a hope." }),
      b("heading", { text: "3. Ship it", level: "h2", align: "left" }),
      rich("<p>Astro builds to plain HTML. Host it anywhere — including nothing more than a folder on a static host.</p>"),
    ],
  },
];

export async function seedDemoGuides(db: SeedDb): Promise<void> {
  let order = 0;
  for (const g of GUIDES) {
    await upsertEntry(db, "guide", g.slug, g.title, g.data, { sortOrder: order++, blocks: g.blocks });
  }
  log(`demo guides seeded (${GUIDES.length} written guides)`);
}
