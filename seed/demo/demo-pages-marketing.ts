import { b, rich } from "./demo-blocks";
import { upsertPage } from "./demo-page-helpers";
import type { SeedDb } from "../lib";

/**
 * Demo marketing pages: services, pricing, license, membership, contact.
 * Reproduces the pb-data.js page trees using the real block types (pricing,
 * richtext, callout, list, buttons, form).
 */
export async function seedDemoMarketingPages(db: SeedDb): Promise<void> {
  await upsertPage(db, {
    slug: "services",
    route: "/services",
    title: "Services",
    template: "landing",
    seoTitle: "Services — Tan Ho Studio",
    seoDescription: "Design, build, and migration help for people who want to own their site.",
    blocks: [
      b("heading", { text: "Services", level: "h1", align: "left" }),
      rich(
        "<p>Three ways to work together. Each one ends with you owning the result — " +
          "the files, the domain, the account, all of it.</p>",
      ),
      b("section", {
        width: "contained",
        background: "surface",
        py: "lg",
        blocks: [
          b("heading", { text: "Design & build", level: "h2", align: "left" }),
          rich(
            "<p>A complete site, designed and built on tooling you control. Typically 3–6 weeks.</p>",
          ),
          b("heading", { text: "Migration", level: "h2", align: "left" }),
          rich(
            "<p>Move off a hosted platform — Squarespace, Substack, Shopify — and keep your " +
              "rankings and subscribers. Priced per project.</p>",
          ),
          b("heading", { text: "Studio retainer", level: "h2", align: "left" }),
          rich("<p>Ongoing design and front-end help, a few days a month. For teams of one.</p>"),
        ],
      }),
      b("buttons", {
        align: "left",
        items: [{ label: "Get in touch", href: "/contact", variant: "solid", target: "_self" }],
      }),
    ],
  });

  await upsertPage(db, {
    slug: "pricing",
    route: "/pricing",
    title: "Pricing",
    template: "landing",
    seoTitle: "Pricing — Tan Ho Studio",
    seoDescription: "Simple, fixed-scope pricing for design, build, and migration work.",
    blocks: [
      b("heading", { text: "Pricing", level: "h1", align: "center" }),
      rich("<p style=\"text-align:center\">Fixed scope, fixed price. No hourly surprises.</p>"),
      b("pricing", {
        tiers: [
          {
            name: "Starter site",
            price: "$2,400",
            cadence: "one-time",
            features: ["Up to 5 pages", "Your brand + theme", "You own everything", "2 weeks"],
            cta: "Start here",
            href: "/contact",
            featured: false,
          },
          {
            name: "Studio site",
            price: "$6,000",
            cadence: "one-time",
            features: [
              "Everything in Starter",
              "Shop or newsletter",
              "Content migration",
              "SEO handoff",
              "4–6 weeks",
            ],
            cta: "Book a call",
            href: "/contact",
            featured: true,
          },
          {
            name: "Retainer",
            price: "$1,800",
            cadence: "/mo",
            features: ["A few days a month", "Design + front-end", "Priority turnaround"],
            cta: "Enquire",
            href: "/contact",
            featured: false,
          },
        ],
      }),
    ],
  });

  await upsertPage(db, {
    slug: "license",
    route: "/license",
    title: "License",
    template: "article",
    seoTitle: "License — Tan Ho Studio",
    seoDescription: "How the platform behind this site is licensed, and what you can do with it.",
    blocks: [
      b("heading", { text: "License", level: "h1", align: "left" }),
      rich(
        "<p>This whole site runs on an open, white-label platform. You can license it to run " +
          "your own site on the same foundation — your brand, your content, your data.</p>",
      ),
      b("pricing", {
        tiers: [
          {
            name: "Personal",
            price: "$0",
            cadence: "one-time",
            features: ["Self-host", "One site", "Community support"],
            cta: "Get the code",
            href: "/contact",
            featured: false,
          },
          {
            name: "Studio license",
            price: "$149",
            cadence: "one-time",
            features: ["Unlimited client sites", "Priority updates", "Migration recipes"],
            cta: "Buy license",
            href: "/contact",
            featured: true,
          },
        ],
      }),
      b("callout", {
        tone: "info",
        title: "White-label by design",
        body: "Every brand value on this site — the name, the palette, the copy — is data, not code. Swap it and it's yours.",
      }),
    ],
  });

  await upsertPage(db, {
    slug: "membership",
    route: "/membership",
    title: "Membership",
    template: "landing",
    seoTitle: "Membership — Tan Ho Studio",
    seoDescription: "Support the guides and get members-only field notes and templates.",
    blocks: [
      b("heading", { text: "Become a member", level: "h1", align: "center" }),
      rich(
        "<p style=\"text-align:center\">Members keep the guides free for everyone and get the " +
          "full archive, templates, and members-only notes.</p>",
      ),
      b("pricing", {
        tiers: [
          {
            name: "Free",
            price: "$0",
            cadence: "/mo",
            features: ["Every public guide", "Monthly newsletter"],
            cta: "Subscribe",
            href: "/newsletter",
            featured: false,
          },
          {
            name: "Member",
            price: "$8",
            cadence: "/mo",
            features: ["Full guide archive", "Members-only field notes", "Templates & checklists"],
            cta: "Join",
            href: "/membership",
            featured: true,
            trackEvent: "membership_join",
            params: { tier: "member" },
          },
          {
            name: "Founding",
            price: "$80",
            cadence: "/yr",
            features: ["Everything in Member", "Name in the credits", "A riso print, on me"],
            cta: "Go founding",
            href: "/membership",
            featured: false,
            trackEvent: "membership_join",
            params: { tier: "founding" },
          },
        ],
      }),
      b("account", {}),
    ],
  });

  await upsertPage(db, {
    slug: "contact",
    route: "/contact",
    title: "Contact",
    template: "article",
    seoTitle: "Contact — Tan Ho Studio",
    seoDescription: "Start a project or just say hello.",
    blocks: [
      b("heading", { text: "Say hello", level: "h1", align: "left" }),
      rich(
        "<p>Tell me a little about your project and what owning it would mean for you. " +
          "I read everything and reply within a couple of days.</p>",
      ),
      b("form", { formId: "" }),
      rich("<p>Prefer email? <a href=\"mailto:hey@tanho.studio\">hey@tanho.studio</a></p>"),
    ],
  });
}
