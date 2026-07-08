/**
 * SAMPLE PACK — nonprofit / civic.  FICTIONAL demo brand — not a real
 * organization. Replace before launch.
 *
 * A small community environmental/civic nonprofit: a donations-forward site
 * with program pages, a volunteer intake CTA, an informational giving page,
 * a news blog, and a tiny supporter shop. Exercises pages + projects (as
 * programs) + shop (locked) + posts + people + forms + free/paid event types.
 */
import { heading, rich, md, list, buttons, section, metric, projectList, postList } from "../lib/blocks";
import type { SamplePack } from "../lib/types";

export const nonprofitPack: SamplePack = {
  meta: {
    key: "nonprofit",
    brand: "The Riverbend Initiative",
    tagline: "Neighbors restoring the river, one block at a time.",
    blurb:
      "The Riverbend Initiative is a fictional community nonprofit that organizes cleanups, plantings, and civic education — a demo site you can explore, edit, and make your own.",
  },
  theme: {
    accent: "#1c7ed6", // river blue
    accent2: "#7c9a3c", // leaf green
    ink: "#1a1f16",
    paper: "#fbfaf6",
    radius: "round",
    shadow: "subtle",
  },
  menu: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Programs", href: "/work" },
    { label: "Get Involved", href: "/get-involved" },
    { label: "Donate", href: "/donate" },
    { label: "News", href: "/news" },
    { label: "Shop", href: "/shop" },
    { label: "Contact", href: "/contact" },
  ],
  pages: [
    {
      slug: "home",
      route: "/",
      title: "Home",
      seoTitle: "The Riverbend Initiative — neighbors restoring the river",
      seoDescription: "A demo site for a fictional community environmental nonprofit.",
      blocks: [
        heading("Restoring the river, together", "h1"),
        rich(
          "<p>The Riverbend Initiative organizes volunteer cleanups, native plantings, and" +
            " civic education so our watershed stays healthy for the next generation." +
            " Everything on this page is editable in the admin; nothing is hardcoded.</p>",
        ),
        buttons([
          { label: "Donate today", href: "/donate", variant: "solid" },
          { label: "Get involved", href: "/get-involved", variant: "outline" },
        ]),
        section([
          heading("Our impact this year", "h2"),
          metric([
            { value: "1,200", label: "Volunteer hours" },
            { value: "38", label: "Cleanups held" },
            { value: "4,500", label: "Trees & natives planted" },
          ]),
          list([
            "Monthly river cleanups open to all ages",
            "Native tree and wildflower plantings",
            "Free civic workshops on local water policy",
          ]),
        ]),
        heading("Current programs", "h2"),
        projectList(),
      ],
    },
    {
      slug: "about",
      route: "/about",
      title: "About",
      blocks: [
        heading("A neighborhood effort that grew up", "h1"),
        rich(
          "<p>The Riverbend Initiative started as a handful of neighbors picking up trash" +
            " along a local creek. It's now a small nonprofit coordinating volunteers," +
            " partner groups, and local schools. This is a fictional brand used to" +
            " demonstrate this platform — swap in your own story from the admin.</p>",
        ),
        section([
          heading("What we believe", "h2"),
          list([
            "Healthy waterways start with informed neighbors",
            "Volunteering should be easy and welcoming",
            "Transparency in how every dollar is used",
          ]),
        ]),
      ],
    },
    {
      slug: "get-involved",
      route: "/get-involved",
      title: "Get Involved",
      blocks: [
        heading("Ways to help", "h1"),
        rich(
          "<p>No experience needed — just bring gloves and enthusiasm. Sign up for a" +
            " volunteer orientation or reach out about ongoing roles.</p>",
        ),
        section([
          heading("Volunteer roles", "h2"),
          list([
            "Cleanup crew — weekend mornings, all ages welcome",
            "Planting teams — seasonal, tools provided",
            "Workshop helpers — greet neighbors at civic events",
          ]),
        ]),
        buttons([
          { label: "Book a volunteer orientation", href: "/book", variant: "solid" },
          { label: "Ask a question", href: "/contact", variant: "outline" },
        ]),
      ],
    },
    {
      slug: "donate",
      route: "/donate",
      title: "Donate",
      blocks: [
        heading("Support the work", "h1"),
        rich(
          "<p>Every gift funds supplies, native plants, and printed materials for free" +
            " community workshops. This page is sample content — online giving needs" +
            " payments configured before it can accept real donations.</p>",
        ),
        section([
          heading("Where donations go", "h2"),
          list([
            "Tools, gloves, and bags for volunteer cleanups",
            "Native trees and wildflower seed for plantings",
            "Printed guides for free civic workshops",
          ]),
        ]),
        buttons([{ label: "Contact us about giving", href: "/contact", variant: "solid" }]),
      ],
    },
    {
      slug: "contact",
      route: "/contact",
      title: "Contact",
      blocks: [
        heading("Get in touch", "h1"),
        rich(
          "<p>Questions about volunteering, programs, or giving? Reach out — or book a" +
            " volunteer orientation directly. This is sample content for a fictional" +
            " nonprofit.</p>",
        ),
        buttons([{ label: "Book a volunteer orientation", href: "/book", variant: "solid" }]),
      ],
    },
    {
      slug: "news",
      route: "/news",
      title: "News",
      template: "article",
      blocks: [
        heading("News & updates", "h1"),
        rich("<p>Program updates and community stories. Sample posts below.</p>"),
        postList(),
      ],
    },
    {
      slug: "spring-cleanup-recap",
      route: "/news/spring-cleanup-recap",
      title: "Spring cleanup recap: 80 volunteers, three miles of riverbank",
      kind: "post",
      parentSlug: "news",
      blocks: [
        heading("Spring cleanup recap", "h1"),
        md(
          "Eighty neighbors turned out for our spring cleanup, covering **three miles of" +
            " riverbank** in a single morning. This is sample news content — edit or" +
            " delete it.",
        ),
      ],
    },
    {
      slug: "native-planting-season",
      route: "/news/native-planting-season",
      title: "Native planting season kicks off next month",
      kind: "post",
      parentSlug: "news",
      blocks: [
        heading("Native planting season kicks off next month", "h1"),
        md("We're putting 500 native trees and shrubs in the ground. Sign up to help plant."),
      ],
    },
  ],
  entries: [
    {
      type: "project",
      slug: "riverbank-cleanups",
      title: "Riverbank Cleanup Program",
      data: {
        tagline: "Monthly volunteer cleanups keeping trash out of the watershed.",
        year: "2025",
        tags: ["Cleanup", "Volunteers", "Watershed"],
      },
      blocks: [
        heading("Riverbank Cleanup Program", "h1"),
        rich("<p>A demo program page. Volunteers meet monthly to clear litter from riverbank trails.</p>"),
        metric([
          { value: "38", label: "Cleanups this year" },
          { value: "3.2 tons", label: "Debris removed" },
        ]),
      ],
    },
    {
      type: "project",
      slug: "native-plantings",
      title: "Native Plantings Program",
      data: {
        tagline: "Restoring riverbank habitat with native trees and wildflowers.",
        year: "2025",
        tags: ["Restoration", "Habitat", "Volunteers"],
      },
      blocks: [
        heading("Native Plantings Program", "h1"),
        rich("<p>Sample program. Seasonal planting days restore habitat and reduce erosion.</p>"),
        metric([{ value: "4,500", label: "Plants in the ground" }]),
      ],
    },
    {
      type: "project",
      slug: "civic-water-workshops",
      title: "Civic Water Workshops",
      data: {
        tagline: "Free workshops explaining how local water policy gets decided.",
        year: "2024",
        tags: ["Education", "Civic", "Free"],
      },
      blocks: [
        heading("Civic Water Workshops", "h1"),
        rich("<p>Sample program. Free evening workshops for neighbors curious about local water policy.</p>"),
      ],
    },
  ],
  shop: {
    collections: [
      { slug: "supporter-gear", name: "Supporter Gear", description: "Totes and stickers that fund our programs.", visible: true },
    ],
    products: [
      {
        slug: "canvas-tote",
        name: "Riverbend canvas tote",
        priceCents: 1800,
        sku: "RVB-TOTE",
        description: "A cotton canvas tote. Proceeds support cleanups and plantings. Sample product — the store is locked until you enable ecommerce.",
        inventory: 150,
        lowStockThreshold: 15,
        collections: ["supporter-gear"],
      },
      {
        slug: "sticker-set",
        name: "River & leaf sticker set",
        priceCents: 600,
        sku: "RVB-STICKERS",
        description: "A set of three die-cut stickers. Proceeds support the work. Sample product.",
        inventory: 300,
        lowStockThreshold: 30,
        collections: ["supporter-gear"],
      },
    ],
  },
  people: [
    { name: "Marisol Ibarra", email: "marisol@example.com", kind: "member" },
    { name: "Owen Blackwood", email: "owen@example.com", kind: "subscriber" },
    { name: "Delphine Roy", email: "delphine@example.com", kind: "lead" },
  ],
  eventTypes: [
    {
      slug: "volunteer-orientation",
      name: "Volunteer orientation (30 min)",
      durationMin: 30,
      priceCents: 0,
      description: "A free intro session for new volunteers. Free bookings work out of the box.",
      locations: ["in-person"],
    },
    {
      slug: "watershed-workshop",
      name: "Watershed workshop (90 min)",
      durationMin: 90,
      priceCents: 2000,
      description: "A paid deep-dive workshop on local water policy — exercises the paid-booking path (locked until Stripe is configured).",
      locations: ["in-person"],
    },
  ],
};
