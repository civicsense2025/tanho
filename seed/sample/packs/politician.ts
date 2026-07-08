/**
 * SAMPLE PACK — politician / campaign.
 * FICTIONAL persona: "Marisol Vance", State Senate District 14. Translated from
 * the Lamina Design System's `ui_kits/sites/politician` — the persona that most
 * exercises CORE reusable blocks: testimonial (endorsements), poll, metric,
 * timeline, a collection for events, form, and a donation embed.
 */
import {
  heading, md, rich, list, buttons, container, columns, metric, timeline,
  testimonial, poll, collection, newsletter, section, donateEmbed,
} from "../lib/blocks";
import type { SamplePack } from "../lib/types";

const ENDORSEMENTS = [
  { quote: "Marisol is the only person at budget hearings who's actually read the whole budget.", name: "Ken Ostrowski", role: "Owner, Ostrowski Hardware" },
  { quote: "She rebuilt the East Side line on time and under budget. That never happens.", name: "Faye Adeyemi", role: "Former Transit Director" },
  { quote: "My students' bus routes finally make sense. That was her doing.", name: "Renee Kowalski", role: "Teacher, Millbrook Elementary" },
];

export const politicianPack: SamplePack = {
  meta: {
    key: "politician",
    brand: "Marisol Vance",
    tagline: "Steady, local leadership for District 14.",
    blurb:
      "A campaign site — record, platform, endorsements, events, and a donation ask. Twelve years on the Council, six balanced budgets, zero corporate PAC dollars.",
  },
  theme: {
    accent: "#1c4e80",
    accent2: "#a5303a",
    ink: "#12151a",
    paper: "#ffffff",
    font: "humanist",
    radius: "round",
    shadow: "subtle",
  },
  menu: [
    { label: "Home", href: "/" },
    { label: "Meet Marisol", href: "/meet" },
    { label: "Issues", href: "/issues" },
    { label: "Get involved", href: "/involved" },
  ],
  // Campaign events, stored as `project` entries (the built-in generic content
  // type — there is no `event` entity type). The collection binds title +
  // tagline (which carries the date + venue).
  entries: [
    { type: "project", slug: "town-hall-east-side", title: "Town Hall — East Side", status: "published", sortOrder: 0, data: { tagline: "Aug 12 · Millbrook Community Center", year: "2026" } },
    { type: "project", slug: "canvass-launch", title: "Canvass Launch", status: "published", sortOrder: 1, data: { tagline: "Aug 19 · Campaign HQ, 4th & Main", year: "2026" } },
    { type: "project", slug: "small-business-roundtable", title: "Small Business Roundtable", status: "published", sortOrder: 2, data: { tagline: "Aug 26 · Ridgeline Coffee", year: "2026" } },
  ],
  pages: [
    {
      slug: "home",
      route: "/",
      title: "Home",
      seoTitle: "Marisol Vance — State Senate, District 14",
      seoDescription: "Steady, local leadership for District 14.",
      blocks: [
        columns([
          container([
            heading("State Senate — District 14", "h3"),
            heading("Steady, local leadership for District 14.", "h1"),
            rich("<p>Twelve years on the Millbrook City Council. Six balanced budgets. Zero corporate PAC dollars.</p>"),
            buttons([
              { label: "Donate now", href: "/involved", variant: "solid" },
              { label: "Get involved", href: "/involved", variant: "outline" },
            ]),
          ]),
          container([md("_A photo of Marisol goes here — add an Image block._")]),
        ], 2),

        metric([
          { value: "148/150", label: "Council votes cast, on time" },
          { value: "$2.4M", label: "Secured for District 14 transit" },
          { value: "6 / 6", label: "Budgets balanced, no gimmicks" },
        ]),

        section([
          heading("Why I'm running", "h3"),
          rich("<p>I grew up three blocks from where I live now, working nights at my family's hardware store. I'm running because District 14 deserves someone who reads the bill before voting on it.</p>"),
          buttons([{ label: "More about Marisol", href: "/meet", variant: "outline" }]),
        ], "surface"),

        heading("Endorsements", "h3"),
        testimonial(ENDORSEMENTS, { layout: "grid", cols: 3 }),

        heading("What matters most to you?", "h3"),
        poll("Which District 14 priority should come first?", ["Affordable housing", "Public schools", "Roads & transit", "Small business"]),

        heading("Upcoming events", "h2"),
        collection({ kind: "entries", entity: "project" }, [
          container([
            heading("{{record.title}}", "h3"),
            md("**{{record.tagline}}**"),
          ]),
        ], 3),
      ],
    },
    {
      slug: "meet",
      route: "/meet",
      title: "Meet Marisol",
      blocks: [
        heading("Meet Marisol", "h3"),
        heading("Twelve years showing up for District 14.", "h1"),
        rich("<p>Marisol Vance has spent twelve years on the Millbrook City Council, where she balanced six budgets without cutting a single library hour and led the rebuild of the East Side transit line.</p>"),
        list(["Affordable housing", "Public schools", "Small business", "Healthcare access", "Roads & transit"], "check"),
        heading("Background & service", "h2"),
        timeline([
          { date: "2014", title: "Elected, Millbrook City Council", note: "Youngest council member in district history" },
          { date: "2018", title: "Council President", note: "Re-elected twice by colleagues" },
          { date: "2021", title: "East Side Transit rebuild", note: "Delivered under budget" },
          { date: "2026", title: "Announced for State Senate", note: "District 14" },
        ]),
        heading("Endorsements", "h3"),
        testimonial(ENDORSEMENTS, { layout: "carousel" }),
      ],
    },
    {
      slug: "issues",
      route: "/issues",
      title: "Issues",
      blocks: [
        heading("The platform", "h3"),
        heading("Where Marisol stands", "h1"),
        rich("<p>Five priorities for District 14 — each with a full plan and a way to weigh in.</p>"),
        columns([
          container([heading("Affordable housing", "h3"), md("Protect renters and build workforce housing near transit."), buttons([{ label: "Read the plan", href: "#", variant: "outline" }])]),
          container([heading("Public schools", "h3"), md("Fully fund classrooms before consultants."), buttons([{ label: "Read the plan", href: "#", variant: "outline" }])]),
          container([heading("Roads & transit", "h3"), md("Finish the East Side line; fix the worst intersections first."), buttons([{ label: "Read the plan", href: "#", variant: "outline" }])]),
        ], 3),
      ],
    },
    {
      slug: "involved",
      route: "/involved",
      title: "Get involved",
      blocks: [
        heading("Get involved", "h1"),
        section([
          heading("Chip in to District 14", "h2"),
          rich("<p>This campaign is funded by District 14 residents — not corporate PACs. Add an ActBlue/Donorbox embed here.</p>"),
          donateEmbed("https://secure.actblue.com/donate/example", "4 / 3"),
        ], "surface"),
        heading("Campaign updates", "h2"),
        newsletter({ blurb: "News, events, and volunteer shifts — no more than twice a month." }),
      ],
    },
  ],
};
