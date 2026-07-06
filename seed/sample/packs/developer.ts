/**
 * SAMPLE PACK — developer / open-source maintainer.
 * FICTIONAL persona: "Kai Reyes". Translated from the OYS Design System's
 * `ui_kits/sites/developer` — expressed as real page-builder block trees so a
 * non-dev can rebuild every section by dragging blocks.
 *
 * Shows off: the code/terminal block, a `collection` bound to project entries
 * (the general repeater — replaces the design's bespoke work-grid), testimonials
 * as a first-class block, and a sponsor pricing table.
 */
import {
  heading, md, rich, list, buttons, container, columns, code, testimonial,
  pricing, postList, collection, video, section,
} from "../lib/blocks";
import type { SamplePack } from "../lib/types";

export const developerPack: SamplePack = {
  meta: {
    key: "developer",
    brand: "Kai Reyes",
    tagline: "Building small, fast tools. Mostly Rust and TypeScript.",
    blurb:
      "An open-source maintainer's site — projects, writing, a now page, and a sponsor tier. A demo you can explore, edit, and make your own.",
  },
  theme: {
    accent: "#3b5bdb",
    accent2: "#0ca678",
    ink: "#14161a",
    paper: "#ffffff",
    font: "grotesk",
    radius: "square",
    shadow: "flat",
  },
  menu: [
    { label: "Home", href: "/" },
    { label: "Writing", href: "/writing" },
    { label: "Now", href: "/now" },
    { label: "Sponsor", href: "/sponsor" },
  ],
  entries: [
    { type: "project", slug: "ratchet", title: "ratchet", status: "published", sortOrder: 0, data: { tagline: "A fast, remote-caching CI runner", year: "2026" } },
    { type: "project", slug: "fielddb", title: "fielddb", status: "published", sortOrder: 1, data: { tagline: "An edge KV store that doesn't need a rewrite", year: "2025" } },
    { type: "project", slug: "slate-cli", title: "slate", status: "published", sortOrder: 2, data: { tagline: "Scaffold a project in one command", year: "2025" } },
    { type: "project", slug: "hush", title: "hush", status: "published", sortOrder: 3, data: { tagline: "A tiny secrets manager for local dev", year: "2024" } },
  ],
  pages: [
    {
      slug: "home",
      route: "/",
      title: "Home",
      seoTitle: "Kai Reyes — developer tools, mostly Rust & TypeScript",
      seoDescription: "Open-source maintainer building small, fast tools.",
      blocks: [
        columns([
          container([
            heading("// Kai Reyes", "h3"),
            heading("Building small, fast tools. Mostly Rust and TypeScript. Open source by default.", "h1"),
            md("Rust · TypeScript · Postgres · SQLite · Fly.io · Neovim"),
            buttons([
              { label: "View source", href: "#", variant: "solid" },
              { label: "Sponsor this work", href: "/sponsor", variant: "outline" },
            ]),
          ]),
          container([
            code(
              "$ whoami\nkai-reyes\n$ cat status.txt\n4 projects shipping · 3 posts written\nopen to select consulting work\n$",
              { filename: "kai@reyes: ~", language: "sh" },
            ),
          ]),
        ], 2),

        heading("$ ls ./projects --sort=stars", "h3"),
        // The general repeater bound to project entries — a card per project,
        // fields bound with {{record.*}} tokens. Replaces the design's work-grid.
        collection({ kind: "entries", entity: "project" }, [
          container([
            heading("{{record.title}}", "h3"),
            md("{{record.tagline}}"),
            md("`{{record.year}}`"),
          ]),
        ], 4),

        heading("$ ./ratchet demo --record", "h3"),
        video({ caption: "ratchet — 90-second demo" }),

        section([
          heading("// why sponsor", "h3"),
          heading("This work stays free and open because people fund it directly.", "h2"),
          md("No VC, no ads, no telemetry. Sponsors keep releases shipping and issues answered."),
          buttons([{ label: "See sponsor tiers", href: "/sponsor", variant: "solid" }]),
        ], "surface"),
      ],
    },
    {
      slug: "writing",
      route: "/writing",
      title: "Writing",
      blocks: [
        heading("$ ls ./writing", "h3"),
        heading("Writing", "h1"),
        postList(),
      ],
    },
    {
      slug: "now",
      route: "/now",
      title: "Now",
      blocks: [
        heading("$ cat now.md", "h3"),
        heading("What I'm doing now", "h1"),
        list([
          "Rewriting ratchet's scheduler to support remote caching",
          "Writing a short series on shipping small Rust CLIs",
          "Taking 1 consulting engagement/quarter — currently full through Q3",
        ], "bullet"),
        md("// last updated 2026-07-01"),
      ],
    },
    {
      slug: "sponsor",
      route: "/sponsor",
      title: "Sponsor",
      blocks: [
        heading("// sponsor", "h3"),
        heading("Fund the tools you already depend on.", "h1"),
        rich("<p>Every tier funds maintenance time directly — no perks gated behind paywalls, just more hours on the code.</p>"),
        pricing([
          { name: "Coffee", price: "$5", cadence: "/mo", features: ["Say thanks, name in CHANGELOG.md"], cta: "Sponsor", href: "#" },
          { name: "Backer", price: "$25", cadence: "/mo", features: ["Everything in Coffee", "Priority on issue triage"], cta: "Sponsor", href: "#", featured: true },
          { name: "Champion", price: "$100", cadence: "/mo", features: ["Everything in Backer", "Monthly office hours", "Logo on README"], cta: "Sponsor", href: "#" },
        ]),
        heading("// from sponsors", "h3"),
        testimonial([
          { quote: "ratchet cut our CI time by 60% the week we adopted it. Kai actually answers issues too.", name: "Priya Nandakumar", role: "Staff engineer" },
          { quote: "fielddb is the only edge KV store I've used that didn't need a rewrite six months in.", name: "Marcus Webb", role: "Backend lead" },
          { quote: "Sponsoring ratchet is the best $25 a month I spend on my own build times.", name: "Dana Ferro", role: "Solo maintainer" },
        ], { layout: "grid", cols: 3 }),
      ],
    },
  ],
};
