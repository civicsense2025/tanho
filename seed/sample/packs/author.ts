/**
 * SAMPLE PACK — author / novelist.
 * FICTIONAL persona: "Renata Kade". Translated from the OYS Design System's
 * `ui_kits/sites/author`. The design's bespoke "statement" / "work-grid" /
 * "press-list" molecules are re-expressed here from CORE blocks: an about
 * section from heading+metric+richtext+list, a `collection` bound to book
 * entries, and a press `collection`.
 */
import {
  heading, md, rich, list, buttons, container, columns, metric, timeline,
  collection, newsletter, section, statement,
} from "../lib/blocks";
import type { SamplePack } from "../lib/types";

export const authorPack: SamplePack = {
  meta: {
    key: "author",
    brand: "Renata Kade",
    tagline: "Novelist of the disappearing Gulf coast.",
    blurb:
      "An author's site — new novel, backlist, honors, tour dates, and a newsletter. Set along a Gulf coast that turns on inheritance in every sense.",
  },
  theme: {
    accent: "#6e2b32",
    accent2: "#585c34",
    ink: "#1c1a16",
    paper: "#fdfcf9",
    font: "serif",
    radius: "soft",
    shadow: "subtle",
  },
  menu: [
    { label: "Home", href: "/" },
    { label: "Books", href: "/books" },
    { label: "Press", href: "/press" },
  ],
  entries: [
    { type: "project", slug: "the-long-weather", title: "The Long Weather", status: "published", sortOrder: 0, data: { tagline: "A daughter returns to the coast to settle her mother's estate — and her silence.", year: "2026" } },
    { type: "project", slug: "what-the-river-keeps", title: "What the River Keeps", status: "published", sortOrder: 1, data: { tagline: "Southern Fiction Award winner.", year: "2024" } },
    { type: "project", slug: "small-mercies", title: "Small Mercies", status: "published", sortOrder: 2, data: { tagline: "A debut collection.", year: "2021" } },
  ],
  pages: [
    {
      slug: "home",
      route: "/",
      title: "Home",
      seoTitle: "Renata Kade — novelist of the disappearing Gulf coast",
      seoDescription: "Author of The Long Weather and two other books.",
      blocks: [
        heading("New novel — out now", "h3"),
        heading("The Long Weather", "h1"),
        rich("<p>A daughter returns to the coast to settle her mother's estate — and her silence.</p>"),
        buttons([
          { label: "Order the book", href: "/books", variant: "solid" },
          { label: "Read an excerpt", href: "/books", variant: "outline" },
        ]),

        heading("Backlist", "h3"),
        collection({ kind: "entries", entity: "project" }, [
          container([
            heading("{{record.title}}", "h3"),
            md("{{record.tagline}}"),
            md("`{{record.year}}`"),
          ]),
        ], 3),

        // The design's "statement" about-molecule, re-expressed from core blocks.
        section([
          heading("About", "h3"),
          heading("Renata Kade", "h2"),
          rich("<p>Renata Kade is the author of three books, including the novel The Long Weather. Her fiction is set along a disappearing Gulf coast and turns on inheritance in every sense — the houses we're left, the silences we're handed, and the weather that keeps coming whether we're ready or not.</p>"),
          metric([
            { value: "3", label: "Books published" },
            { value: "12", label: "Languages" },
            { value: "4k+", label: "Newsletter readers" },
          ]),
          heading("What I write about", "h3"),
          list(["Family & inheritance", "The Gulf South", "Water & landscape", "Grief and its silences"], "check"),
        ], "surface"),

        heading("Honors", "h2"),
        timeline([
          { date: "2026", title: "Gulf Coast Book Prize — Finalist", note: "The Long Weather" },
          { date: "2024", title: "Southern Fiction Award — Winner", note: "What the River Keeps" },
          { date: "2021", title: "Debut of the Year — Shortlist", note: "Small Mercies" },
        ]),

        statement("A few times a year: new work, tour dates, and notes from the desk. No noise.", { size: "lg" }),
        newsletter({ title: "The newsletter", blurb: "Letters from the coast." }),
      ],
    },
    {
      slug: "books",
      route: "/books",
      title: "Books",
      blocks: [
        heading("Books", "h1"),
        rich("<p>Three books and counting, set along a disappearing Gulf coast.</p>"),
        collection({ kind: "entries", entity: "project" }, [
          container([
            heading("{{record.title}}", "h3"),
            md("{{record.tagline}}"),
          ]),
        ], 99),
      ],
    },
    {
      slug: "press",
      route: "/press",
      title: "Press",
      blocks: [
        heading("Press & media", "h1"),
        columns([
          container([heading("The house that taught me to write endings", "h3"), md("Longform Quarterly · 2026")]),
          container([heading("Nine Winters", "h3"), md("The Gulf Review · 2025")]),
          container([heading("Contributor — 'County Line'", "h3"), md("New Southern Voices · 2024")]),
        ], 3),
      ],
    },
  ],
};
