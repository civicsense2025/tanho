import { b, rich } from "./demo-blocks";
import { type GuideSeed } from "./demo-guides-stacks-shared";

/** Stack-picker guide for people with no existing site to migrate. */
export const FRESH_START: GuideSeed = {
  slug: "starting-fresh-which-stack",
  title: "Starting from scratch? Here's the stack I'd pick",
  data: {
    tagline: "A decision framework for new entrepreneurs and creatives with no existing site to migrate",
    summary: "You don't have lock-in to escape yet — you get to choose correctly the first time. Here's how I'd think through budget, skill, and growth plans.",
    category: "own-your-stack",
    source_platform: "",
    target_platform: "",
    difficulty: "beginner",
    effort_hours_min: 0,
    effort_hours_max: 0,
    cost_min_usd: 0,
    cost_max_usd: 45,
    cost_period: "mo",
    tags: ["platform-evaluation"],
    resource_slugs: [],
    skills_required: [],
    requirements: [],
  },
  blocks: [
    b("heading", { text: "Starting from scratch? Here's the stack I'd pick", level: "h1", align: "left" }),
    rich("<p>Everything else in this hub is about getting <em>out</em> of a platform. If you're starting fresh, you get to skip that entirely — you just have to not lock yourself in on day one. Here's the framework I actually use when someone asks me this.</p>"),
    b("heading", { text: "Start with three questions", level: "h2", align: "left" }),
    b("list", { style: "number", items: [
      "Can you write a little code, or do you need a visual builder? Be honest — this decides half of it.",
      "What's your real monthly budget once you have actual users, not just at launch?",
      "Do you already know you'll need a database (accounts, orders, user content), or is this pure content/marketing?",
    ] }),
    b("heading", { text: "If you can't write code at all", level: "h2", align: "left" }),
    rich("<p>Read the <a href='/guides/should-you-use-webflow'>Webflow evaluation</a> first. It's the only visual builder here with a real API and CMS, meaning you're not painted into a corner later if you do want to add custom functionality. Squarespace is fine for a pure marketing page you're comfortable rebuilding in a year — read that evaluation too before you commit.</p>"),
    b("heading", { text: "If you can write basic code and budget is tight", level: "h2", align: "left" }),
    rich("<p>Start on <a href='/guides/deploy-on-vercel-and-supabase'>Vercel + Supabase</a> or <a href='/guides/deploy-on-cloudflare-pages-and-d1'>Cloudflare Pages + D1</a>. Both have genuinely usable free tiers, so you can build the whole thing before spending a dollar. Cloudflare is cheaper at scale (no bandwidth charges, ever) but has a steeper edge-runtime learning curve; Vercel is the more familiar Node-style deploy.</p>"),
    b("heading", { text: "If you're building something with real users and money moving through it", level: "h2", align: "left" }),
    rich("<p>Go straight to <a href='/guides/deploy-on-digitalocean-and-supabase'>DigitalOcean + Supabase</a> or <a href='/guides/deploy-on-vercel-and-neon'>Vercel + Neon</a>. Both give you predictable, flat-ish pricing rather than the bandwidth-overage bill shock some people have hit on pure serverless platforms at scale, and Neon's database branching is genuinely useful once you have a real team shipping features in parallel.</p>"),
    b("callout", { tone: "warning", title: "Skip Hetzner + self-hosted Postgres for now", body: "If you're asking \"which stack should I start with,\" you're not the audience for full self-hosting yet. Come back to it once a managed database bill has actually gotten expensive enough to justify the ops work — trying to learn server administration and build your first product at the same time is how both get done badly." }),
    b("heading", { text: "The one rule that matters more than the stack", level: "h2", align: "left" }),
    b("callout", { tone: "tip", title: "Export first, choose second", body: "Whatever you pick, confirm on day one that you can get your own data back out in a usable format — a real SQL dump or CSV, not a locked proprietary export. Every guide in this hub exists because someone didn't check that first. Don't be the next one." }),
  ],
};
