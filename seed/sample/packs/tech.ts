/**
 * SAMPLE PACK — tech / SaaS.  FICTIONAL demo brand: "Pixelforge Labs".
 * Not a real company. Replace all content before launch.
 *
 * A small developer-tools studio: a product marketing site with docs-style
 * guides, a changelog blog, a locked merch shop, and a demo-call booking type.
 * Exercises pages + projects + guides + shop (locked) + posts + people + forms.
 */
import { heading, rich, md, list, buttons, section, metric, pricing, projectList, postList } from "../lib/blocks";
import type { SamplePack } from "../lib/types";

export const techPack: SamplePack = {
  meta: {
    key: "tech",
    brand: "Pixelforge Labs",
    tagline: "Developer tools that get out of your way.",
    blurb:
      "Pixelforge Labs builds small, sharp tools for engineering teams — a demo site you can explore, edit, and make your own.",
  },
  theme: {
    accent: "#3b5bdb", // indigo
    accent2: "#0ca678", // teal
    ink: "#14161a",
    paper: "#ffffff",
    radius: "soft",
    shadow: "subtle",
  },
  menu: [
    { label: "Product", href: "/" },
    { label: "Pricing", href: "/pricing" },
    { label: "Docs", href: "/guides" },
    { label: "Work", href: "/work" },
    { label: "Changelog", href: "/blog" },
    { label: "Shop", href: "/shop" },
    { label: "Contact", href: "/contact" },
  ],
  pages: [
    {
      slug: "home",
      route: "/",
      title: "Home",
      seoTitle: "Pixelforge Labs — developer tools that get out of your way",
      seoDescription: "A demo site for a fictional developer-tools studio.",
      blocks: [
        heading("Ship faster with tools that respect your stack", "h1"),
        rich(
          "<p>Pixelforge Labs builds focused developer tools — a CLI, a CI cache, and a" +
            " local-first sync engine. Everything on this page is editable in the admin;" +
            " nothing is hardcoded.</p>",
        ),
        buttons([
          { label: "See pricing", href: "/pricing", variant: "solid" },
          { label: "Read the docs", href: "/guides", variant: "outline" },
        ]),
        section([
          heading("Why teams pick us", "h2"),
          metric([
            { value: "40%", label: "Faster CI" },
            { value: "9ms", label: "p50 sync" },
            { value: "0", label: "Config files" },
          ]),
          list([
            "Local-first — works offline, syncs when you're back",
            "One binary, zero config",
            "Open telemetry, no lock-in",
          ]),
        ]),
        heading("Recent work", "h2"),
        projectList(),
      ],
    },
    {
      slug: "about",
      route: "/about",
      title: "About",
      blocks: [
        heading("A small team with strong opinions", "h1"),
        rich(
          "<p>We're a distributed studio of engineers who got tired of tools that fight" +
            " you. Pixelforge Labs is a fictional brand used to demonstrate this platform —" +
            " swap in your own story from the admin.</p>",
        ),
        section([
          heading("How we work", "h2"),
          list([
            "Small releases, shipped often",
            "Docs written before the code",
            "Support that actually answers",
          ]),
        ]),
      ],
    },
    {
      slug: "pricing",
      route: "/pricing",
      title: "Pricing",
      template: "landing",
      blocks: [
        heading("Simple, honest pricing", "h1"),
        rich("<p>Start free, upgrade when your team grows. Prices below are sample data.</p>"),
        pricing([
          {
            name: "Solo",
            price: "$0",
            cadence: "/mo",
            features: ["1 developer", "Local sync", "Community support"],
            cta: "Start free",
            href: "/contact",
          },
          {
            name: "Team",
            price: "$29",
            cadence: "/seat/mo",
            features: ["Unlimited devs", "Shared CI cache", "Priority support"],
            cta: "Start a trial",
            href: "/contact",
            featured: true,
          },
          {
            name: "Enterprise",
            price: "Let's talk",
            features: ["SSO + SCIM", "Private cloud", "SLA"],
            cta: "Contact sales",
            href: "/contact",
          },
        ]),
      ],
    },
    {
      slug: "contact",
      route: "/contact",
      title: "Contact",
      blocks: [
        heading("Talk to us", "h1"),
        rich(
          "<p>Questions about the tools or a demo? Reach out — or book a call from the" +
            " scheduling page. This is sample content for a fictional studio.</p>",
        ),
        buttons([{ label: "Book a demo call", href: "/book", variant: "solid" }]),
      ],
    },
    {
      slug: "blog",
      route: "/blog",
      title: "Changelog",
      template: "article",
      blocks: [
        heading("Changelog", "h1"),
        rich("<p>Product updates and release notes. Sample posts below.</p>"),
        postList(),
      ],
    },
    {
      slug: "release-0-9",
      route: "/blog/release-0-9",
      title: "v0.9 — faster sync",
      kind: "post",
      parentSlug: "blog",
      blocks: [
        heading("v0.9 — faster sync", "h1"),
        md(
          "We rewrote the sync engine's diffing layer. **p50 sync dropped to 9ms** on" +
            " typical repos. This is sample changelog content — edit or delete it.",
        ),
      ],
    },
    {
      slug: "release-0-8",
      route: "/blog/release-0-8",
      title: "v0.8 — offline mode",
      kind: "post",
      parentSlug: "blog",
      blocks: [
        heading("v0.8 — offline mode", "h1"),
        md("Full offline support landed: keep working on a plane, sync when you land."),
      ],
    },
  ],
  entries: [
    {
      type: "project",
      slug: "sync-engine",
      title: "Local-first sync engine",
      data: {
        tagline: "A CRDT sync engine that works offline and merges without conflicts.",
        year: "2025",
        tags: ["Systems", "Rust", "CRDT"],
      },
      blocks: [
        heading("Local-first sync engine", "h1"),
        rich("<p>A demo case study. Built on CRDTs; syncs in the background, merges cleanly.</p>"),
        metric([
          { value: "9ms", label: "p50 sync" },
          { value: "100%", label: "Offline capable" },
        ]),
      ],
    },
    {
      type: "project",
      slug: "ci-cache",
      title: "Distributed CI cache",
      data: {
        tagline: "A content-addressed CI cache that cut build times by 40%.",
        year: "2024",
        tags: ["Infra", "Go", "Caching"],
      },
      blocks: [
        heading("Distributed CI cache", "h1"),
        rich("<p>Sample project. Content-addressed storage shared across CI runners.</p>"),
      ],
    },
    {
      type: "guide",
      slug: "quickstart",
      title: "Quickstart",
      data: {
        tagline: "Install the CLI and ship your first sync in five minutes.",
        summary: "A getting-started guide for the fictional Pixelforge CLI.",
        difficulty: "beginner",
        effort_hours_min: 0,
        effort_hours_max: 1,
      },
      blocks: [
        heading("Quickstart", "h1"),
        md("1. Install the CLI\n2. Run `pixel init`\n3. Push your first sync\n\nSample docs content."),
      ],
    },
    {
      type: "guide",
      slug: "self-hosting",
      title: "Self-hosting",
      data: {
        tagline: "Run the sync server on your own infrastructure.",
        summary: "How to self-host, for teams that want to own their stack.",
        difficulty: "intermediate",
        effort_hours_min: 1,
        effort_hours_max: 3,
      },
      blocks: [
        heading("Self-hosting", "h1"),
        md("Deploy the server with Docker, point the CLI at it, done. Sample guide."),
      ],
    },
  ],
  shop: {
    collections: [
      { slug: "merch", name: "Merch", description: "Stickers and tees for the terminal-dwelling.", visible: true },
    ],
    products: [
      {
        slug: "sticker-pack",
        name: "Sticker pack",
        priceCents: 800,
        sku: "PXL-STICKERS",
        description: "A die-cut sticker pack. Sample product — the store is locked until you enable ecommerce.",
        inventory: 200,
        lowStockThreshold: 20,
        collections: ["merch"],
        variants: [{ label: "Pack of 5", priceCents: 800, inventory: 200, sku: "PXL-STICKERS-5" }],
      },
      {
        slug: "logo-tee",
        name: "Logo tee",
        priceCents: 2800,
        compareAtCents: 3200,
        sku: "PXL-TEE",
        description: "A soft cotton tee with the (fictional) Pixelforge mark. Sample product.",
        inventory: 60,
        lowStockThreshold: 8,
        collections: ["merch"],
        variants: [
          { label: "S", priceCents: 2800, inventory: 15, sku: "PXL-TEE-S" },
          { label: "M", priceCents: 2800, inventory: 25, sku: "PXL-TEE-M" },
          { label: "L", priceCents: 2800, inventory: 20, sku: "PXL-TEE-L" },
        ],
      },
    ],
  },
  people: [
    { name: "Devon Marsh", email: "devon@example.com", kind: "member" },
    { name: "Priya Anand", email: "priya@example.com", kind: "subscriber" },
    { name: "Sam Okafor", email: "sam@example.com", kind: "lead" },
  ],
  eventTypes: [
    {
      slug: "demo-call",
      name: "Product demo (30 min)",
      durationMin: 30,
      priceCents: 0,
      description: "A free walkthrough of the tools. Free bookings work out of the box.",
      locations: ["zoom"],
    },
    {
      slug: "onboarding",
      name: "Paid onboarding (60 min)",
      durationMin: 60,
      priceCents: 15000,
      description: "A paid onboarding session — exercises the paid-booking path (locked until Stripe is configured).",
      locations: ["zoom"],
    },
  ],
};
