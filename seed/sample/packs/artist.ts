/**
 * SAMPLE PACK — artist / creative maker.  FICTIONAL demo brand: "Willowprint
 * Studio". Not a real company or person. Replace before launch.
 *
 * An independent illustrator & risograph print maker: a shop-forward
 * portfolio site with a gallery of projects, a locked print shop, a process
 * page, and a journal blog. Exercises pages + projects + shop (locked) +
 * posts + people + forms.
 */
import { heading, rich, md, list, buttons, section, metric, projectList, postList } from "../lib/blocks";
import type { SamplePack } from "../lib/types";

export const artistPack: SamplePack = {
  meta: {
    key: "artist",
    brand: "Willowprint Studio",
    tagline: "Illustration and risograph prints, made by hand.",
    blurb:
      "Willowprint Studio is a one-person illustration and risograph print studio — a demo site you can explore, edit, and make your own.",
  },
  theme: {
    accent: "#e2652f", // terracotta
    accent2: "#7c9473", // sage
    ink: "#231f1c",
    paper: "#fdf8f2",
    radius: "round",
    shadow: "subtle",
  },
  menu: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Process", href: "/process" },
    { label: "Work", href: "/work" },
    { label: "Journal", href: "/blog" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  pages: [
    {
      slug: "home",
      route: "/",
      title: "Home",
      seoTitle: "Willowprint Studio — illustration & risograph prints",
      seoDescription: "A demo site for a fictional illustration and risograph print studio.",
      blocks: [
        heading("Hand-printed illustration, one layer at a time", "h1"),
        rich(
          "<p>Willowprint Studio is a small risograph print shop run by one illustrator. Every print below is sample content — this whole site is editable in the admin, nothing is hardcoded.</p>",
        ),
        buttons([
          { label: "Shop prints", href: "/shop", variant: "solid" },
          { label: "See the process", href: "/process", variant: "outline" },
        ]),
        section([
          heading("About the studio", "h2"),
          rich(
            "<p>Willowprint is a fictional demo brand: a one-room studio with two riso duplicators, a lot of paper, and a mailing list of people who like getting ink under their nails.</p>",
          ),
          metric([
            { value: "3", label: "Riso colors per run" },
            { value: "50", label: "Print editions" },
            { value: "100%", label: "Hand-fed" },
          ]),
        ]),
        heading("Recent series", "h2"),
        projectList(),
      ],
    },
    {
      slug: "about",
      route: "/about",
      title: "About",
      blocks: [
        heading("A studio of one, mostly", "h1"),
        rich(
          "<p>Willowprint Studio is a fictional brand used to demonstrate this platform — swap in your own bio, photos, and story from the admin. The studio makes illustrated riso prints, zines, and the occasional commissioned piece.</p>",
        ),
        section([
          heading("How the studio works", "h2"),
          list([
            "Small print runs, numbered by hand",
            "New series dropped a few times a year",
            "Commissions taken in short open windows",
          ]),
        ]),
      ],
    },
    {
      slug: "process",
      route: "/process",
      title: "Process",
      blocks: [
        heading("How the prints get made", "h1"),
        rich(
          "<p>Sample process notes for the fictional Willowprint studio — a rough tour of how a drawing becomes a numbered print.</p>",
        ),
        section([
          heading("From sketch to print", "h2"),
          list(
            [
              "Draw and separate the image into 2-3 color layers",
              "Burn a master for each layer on the riso duplicator",
              "Print one color at a time, letting ink dry between runs",
              "Trim, number, and sign each edition by hand",
            ],
            "number",
          ),
        ]),
        rich("<p>Want something custom? See the commission consult on the contact page.</p>"),
      ],
    },
    {
      slug: "contact",
      route: "/contact",
      title: "Contact",
      blocks: [
        heading("Say hello", "h1"),
        rich(
          "<p>Questions about a print, a commission, or a stockist request? Reach out — or book time below. This is sample content for a fictional studio.</p>",
        ),
        buttons([
          { label: "Book a studio visit", href: "/book", variant: "solid" },
          { label: "Email the studio", href: "mailto:hello@example.com", variant: "outline" },
        ]),
      ],
    },
    {
      slug: "blog",
      route: "/blog",
      title: "Journal",
      template: "article",
      blocks: [
        heading("Journal", "h1"),
        rich("<p>Notes from the print table. Sample posts below.</p>"),
        postList(),
      ],
    },
    {
      slug: "riso-101",
      route: "/blog/riso-101",
      title: "Risograph, briefly",
      kind: "post",
      parentSlug: "blog",
      blocks: [
        heading("Risograph, briefly", "h1"),
        md(
          "A riso duplicator prints **one color per pass**, like a friendlier screen print. Grain and slight misregistration are part of the look, not a flaw. This is sample journal content — edit or delete it.",
        ),
      ],
    },
    {
      slug: "new-zine",
      route: "/blog/new-zine",
      title: "A new zine, out this week",
      kind: "post",
      parentSlug: "blog",
      blocks: [
        heading("A new zine, out this week", "h1"),
        md("A short run of a new illustrated zine just landed in the shop. Sample update."),
      ],
    },
  ],
  entries: [
    {
      type: "project",
      slug: "tidepool-series",
      title: "Tidepool series",
      data: {
        tagline: "A set of six riso prints inspired by coastal tidepools.",
        year: "2025",
        tags: ["Illustration", "Riso", "Nature"],
      },
      blocks: [
        heading("Tidepool series", "h1"),
        rich("<p>A demo case study. Six two-color riso prints, editioned by hand at 50 each.</p>"),
        metric([
          { value: "6", label: "Prints in series" },
          { value: "50", label: "Editions each" },
        ]),
      ],
    },
    {
      type: "project",
      slug: "night-market-zine",
      title: "Night Market zine",
      data: {
        tagline: "A 24-page illustrated zine following one night at a market.",
        year: "2024",
        tags: ["Zine", "Sequential", "Riso"],
      },
      blocks: [
        heading("Night Market zine", "h1"),
        rich("<p>Sample project. A self-published riso zine, hand-bound in short runs.</p>"),
      ],
    },
    {
      type: "project",
      slug: "civic-portraits",
      title: "Civic Portraits commission",
      data: {
        tagline: "A commissioned set of portrait prints for a community library.",
        year: "2024",
        tags: ["Commission", "Portrait"],
      },
      blocks: [
        heading("Civic Portraits commission", "h1"),
        rich("<p>Sample commissioned project for a fictional local library branch.</p>"),
      ],
    },
  ],
  shop: {
    collections: [
      { slug: "prints", name: "Prints", description: "Riso prints from current and past series.", visible: true },
      { slug: "paper-goods", name: "Paper goods", description: "Zines and printed sets.", visible: true },
    ],
    products: [
      {
        slug: "tidepool-print-a",
        name: "Tidepool print, no. 1",
        priceCents: 2200,
        sku: "WPS-TIDE-01",
        description: "A two-color riso print from the Tidepool series. Sample product — the store is locked until you enable ecommerce.",
        inventory: 42,
        lowStockThreshold: 10,
        collections: ["prints"],
        variants: [
          { label: "8x10 in", priceCents: 2200, inventory: 30, sku: "WPS-TIDE-01-8X10" },
          { label: "11x14 in", priceCents: 3200, inventory: 12, sku: "WPS-TIDE-01-11X14" },
        ],
      },
      {
        slug: "tidepool-print-b",
        name: "Tidepool print, no. 2",
        priceCents: 2200,
        sku: "WPS-TIDE-02",
        description: "A second print from the Tidepool series. Sample product.",
        inventory: 38,
        lowStockThreshold: 10,
        collections: ["prints"],
        variants: [
          { label: "8x10 in", priceCents: 2200, inventory: 26, sku: "WPS-TIDE-02-8X10" },
          { label: "11x14 in", priceCents: 3200, inventory: 12, sku: "WPS-TIDE-02-11X14" },
        ],
      },
      {
        slug: "night-market-zine",
        name: "Night Market zine",
        priceCents: 1400,
        sku: "WPS-ZINE-NM",
        description: "A 24-page hand-bound riso zine. Sample product — store stays locked until ecommerce is enabled.",
        inventory: 75,
        lowStockThreshold: 15,
        collections: ["paper-goods"],
        variants: [{ label: "Standard", priceCents: 1400, inventory: 75, sku: "WPS-ZINE-NM-STD" }],
      },
      {
        slug: "poster-set",
        name: "Studio poster set",
        priceCents: 4800,
        compareAtCents: 5600,
        sku: "WPS-POSTER-SET",
        description: "A set of three riso posters pulled from past series. Sample bundle product.",
        inventory: 25,
        lowStockThreshold: 5,
        collections: ["prints", "paper-goods"],
        variants: [{ label: "Set of 3", priceCents: 4800, inventory: 25, sku: "WPS-POSTER-SET-3" }],
      },
    ],
  },
  people: [
    { name: "Marisol Ito", email: "marisol@example.com", kind: "member" },
    { name: "Diego Falcone", email: "diego@example.com", kind: "subscriber" },
    { name: "Nadia Brooks", email: "nadia@example.com", kind: "lead" },
  ],
  eventTypes: [
    {
      slug: "studio-visit",
      name: "Studio visit (20 min)",
      durationMin: 20,
      priceCents: 0,
      description: "A free drop-in visit to see the riso duplicators in action. Free bookings work out of the box.",
      locations: ["in-person"],
    },
    {
      slug: "commission-consult",
      name: "Commission consult (45 min)",
      durationMin: 45,
      priceCents: 8000,
      description: "A paid consult to scope a custom illustration commission — exercises the paid-booking path (locked until Stripe is configured).",
      locations: ["zoom"],
    },
  ],
};
