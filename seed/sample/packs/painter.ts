/**
 * SAMPLE PACK — visual artist / painter.
 * FICTIONAL persona: "Mira Voss". Translated from the OYS Design System's
 * `ui_kits/sites/artist`. (Keyed `painter` so it sits alongside — not on top of —
 * the existing `artist`/"Willowprint" illustration pack.) Work grid → a
 * `collection` bound to work entries; the studio reel is a video; the about
 * "statement" molecule is re-expressed from core blocks; exhibitions → a timeline.
 */
import {
  heading, md, rich, list, buttons, container, metric, timeline, video,
  collection, section, statement,
} from "../lib/blocks";
import type { SamplePack } from "../lib/types";

export const painterPack: SamplePack = {
  meta: {
    key: "painter",
    brand: "Mira Voss",
    tagline: "Paintings about noise & weather.",
    blurb:
      "A painter's site — recent work, studio process, an artist statement, selected exhibitions, and commissions. Paintings and assemblage about what a storm leaves behind.",
  },
  theme: {
    accent: "#3a3a44",
    accent2: "#8a6d3b",
    ink: "#171719",
    paper: "#faf9f7",
    font: "grotesk",
    radius: "square",
    shadow: "flat",
  },
  menu: [
    { label: "Home", href: "/" },
    { label: "Gallery", href: "/gallery" },
    { label: "Commissions", href: "/commissions" },
  ],
  entries: [
    { type: "project", slug: "dead-channel", title: "Dead Channel", status: "published", sortOrder: 0, data: { tagline: "Oil, sand, and resin on salvaged panel.", year: "2026" } },
    { type: "project", slug: "salt-on-glass", title: "Salt on Glass", status: "published", sortOrder: 1, data: { tagline: "Oil and ash on canvas.", year: "2025" } },
    { type: "project", slug: "the-hum-a-room-keeps", title: "The Hum a Room Keeps", status: "published", sortOrder: 2, data: { tagline: "Assemblage with found wire.", year: "2025" } },
  ],
  pages: [
    {
      slug: "home",
      route: "/",
      title: "Home",
      seoTitle: "Mira Voss — paintings about noise & weather",
      seoDescription: "Paintings and assemblage about what a storm leaves behind.",
      blocks: [
        heading("Paintings about noise & weather", "h1"),
        rich("<p>Paintings and assemblage about noise, weather, and what's left over.</p>"),
        buttons([
          { label: "View available work", href: "/gallery", variant: "solid" },
          { label: "Commission a piece", href: "/commissions", variant: "outline" },
        ]),

        heading("In the studio", "h3"),
        video({ caption: "Studio process — reel · 2:48" }),

        heading("Recent work", "h2"),
        collection({ kind: "entries", entity: "project" }, [
          container([
            heading("{{record.title}}", "h3"),
            md("{{record.tagline}}"),
            md("`{{record.year}}`"),
          ]),
        ], 3),

        section([
          heading("Statement", "h3"),
          statement("I make paintings about the things a storm leaves behind — static on a dead channel, salt on a windshield, the hum a room keeps after everyone's gone.", { size: "lg", align: "left" }),
          rich("<p>I build surfaces in layers, then sand them back until the weather underneath shows through. Sand, ash, and found wire come from the places I paint about: a coast that keeps rearranging itself.</p>"),
          metric([
            { value: "40+", label: "Works to date" },
            { value: "9", label: "Exhibitions" },
            { value: "3", label: "Collections" },
          ]),
          heading("Materials", "h3"),
          list(["Oil", "Sand", "Ash", "Resin", "Found wire", "Salvaged panel"], "check"),
        ], "surface"),

        heading("Selected exhibitions", "h2"),
        timeline([
          { date: "2026", title: "Weather Systems", note: "Solo — Ridgeline Gallery, Queens" },
          { date: "2025", title: "Salvage", note: "Two-person — Delta Contemporary" },
          { date: "2024", title: "New Coast", note: "Group — Gulf Biennial" },
        ]),
      ],
    },
    {
      slug: "gallery",
      route: "/gallery",
      title: "Gallery",
      blocks: [
        heading("Gallery", "h1"),
        rich("<p>Available and archived work.</p>"),
        collection({ kind: "entries", entity: "project" }, [
          container([
            heading("{{record.title}}", "h3"),
            md("{{record.tagline}}"),
          ]),
        ], 99),
      ],
    },
    {
      slug: "commissions",
      route: "/commissions",
      title: "Commissions",
      blocks: [
        heading("Commissions", "h1"),
        rich("<p>Commissions open twice a year. Tell me about the space and the feeling — not the size.</p>"),
        list(["A short conversation about the work and the room", "A deposit to reserve a slot in the calendar", "Progress photos at three stages", "Delivery, crated, anywhere in the continental US"], "number"),
        buttons([{ label: "Start a commission inquiry", href: "#", variant: "solid" }]),
      ],
    },
  ],
};
