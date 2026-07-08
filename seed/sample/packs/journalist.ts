/**
 * SAMPLE PACK — journalist / independent reporter.
 * FICTIONAL persona: "Dana Ortiz". Translated from the Lamina Design System's
 * `ui_kits/sites/journalist`. The design's "story-feed" becomes a `collection`
 * bound to story entries; the secure-tip band and subscribe tiers are core blocks.
 */
import {
  heading, md, rich, buttons, container, collection, pricing,
  newsletter, section, postList,
} from "../lib/blocks";
import type { SamplePack } from "../lib/types";

export const journalistPack: SamplePack = {
  meta: {
    key: "journalist",
    brand: "Dana Ortiz",
    tagline: "Independent investigative reporting.",
    blurb:
      "A reporter's site — the latest investigation, a story feed, a secure tip line, and reader-supported subscriptions.",
  },
  theme: {
    accent: "#0b3d2e",
    accent2: "#b4531f",
    ink: "#14150f",
    paper: "#fbfaf6",
    font: "serif",
    radius: "square",
    shadow: "flat",
  },
  menu: [
    { label: "Home", href: "/" },
    { label: "Stories", href: "/stories" },
    { label: "Subscribe", href: "/subscribe" },
  ],
  entries: [
    { type: "project", slug: "warehouse-union-vote", title: "Inside the warehouse union vote nobody covered", status: "published", sortOrder: 0, data: { tagline: "Three months of organizing, one 40-vote margin.", year: "2026" } },
    { type: "project", slug: "county-water-contracts", title: "Who really won the county water contracts", status: "published", sortOrder: 1, data: { tagline: "Following the filings.", year: "2026" } },
    { type: "project", slug: "eviction-court-backlog", title: "The eviction court backlog, by the numbers", status: "published", sortOrder: 2, data: { tagline: "Ten thousand cases, one overwhelmed clerk's office.", year: "2025" } },
  ],
  pages: [
    {
      slug: "home",
      route: "/",
      title: "Home",
      seoTitle: "Dana Ortiz — independent investigative reporting",
      seoDescription: "Reader-supported accountability journalism.",
      blocks: [
        heading("The Investigation", "h3"),
        heading("Inside the warehouse union vote nobody covered", "h1"),
        rich("<p>Three months of organizing, one 40-vote margin, and a company that saw it coming. What the filings show — and what the workers say they were promised.</p>"),
        buttons([
          { label: "Read the investigation", href: "/stories", variant: "solid" },
          { label: "Send a tip", href: "/subscribe", variant: "outline" },
        ]),

        heading("Latest reporting", "h2"),
        collection({ kind: "entries", entity: "project" }, [
          container([
            heading("{{record.title}}", "h3"),
            md("{{record.tagline}}"),
            md("`{{record.year}}`"),
          ]),
        ], 6),

        section([
          heading("Secure tip line", "h3"),
          heading("Have documents that should be public?", "h2"),
          rich("<p>Send records, photos, or a first tip over Signal or SecureDrop. Sources are protected — nothing is published without your say.</p>"),
          buttons([
            { label: "Signal · (504) 555-0148", href: "#", variant: "solid" },
            { label: "How to leak securely", href: "#", variant: "outline" },
          ]),
        ], "surface"),
      ],
    },
    {
      slug: "stories",
      route: "/stories",
      title: "Stories",
      blocks: [
        heading("Stories", "h1"),
        rich("<p>Accountability reporting, filed as it lands.</p>"),
        postList(),
      ],
    },
    {
      slug: "subscribe",
      route: "/subscribe",
      title: "Subscribe",
      blocks: [
        heading("Reader-supported", "h3"),
        heading("This work exists because readers fund it.", "h1"),
        rich("<p>No paywalls on the reporting — but the reporting only happens because members chip in.</p>"),
        pricing([
          { name: "Reader", price: "$8", cadence: "/mo", features: ["Members-only notes", "Early access to investigations"], cta: "Join", href: "#" },
          { name: "Supporter", price: "$20", cadence: "/mo", features: ["Everything in Reader", "Quarterly briefing calls"], cta: "Join", href: "#", featured: true },
          { name: "Patron", price: "$50", cadence: "/mo", features: ["Everything in Supporter", "Name in the annual report"], cta: "Join", href: "#" },
        ]),
        newsletter({ title: "The free newsletter", blurb: "The occasional dispatch — no paywall, no noise." }),
      ],
    },
  ],
};
