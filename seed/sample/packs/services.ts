/**
 * SAMPLE PACK — services / consulting.  FICTIONAL demo brand: "Fernwood & Co."
 * Not a real company. Replace before launch.
 *
 * A small strategy & operations consultancy: a company marketing site with a
 * services page, engagement-model pricing, case studies (via /work projects),
 * an insights blog, and a booking flow for calls. Exercises pages + projects +
 * posts + people + forms — no shop.
 */
import { heading, rich, md, list, buttons, section, metric, pricing, projectList, postList } from "../lib/blocks";
import type { SamplePack } from "../lib/types";

export const servicesPack: SamplePack = {
  meta: {
    key: "services",
    brand: "Fernwood & Co.",
    tagline: "Clarity for growing organizations.",
    blurb:
      "Fernwood & Co. is a small strategy and operations consultancy — a demo site you can explore, edit, and make your own.",
  },
  theme: {
    accent: "#0f4c3a", // deep green
    accent2: "#c9a876", // warm neutral / tan
    ink: "#181a19",
    paper: "#ffffff",
    radius: "round",
    shadow: "subtle",
  },
  menu: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Case Studies", href: "/work" },
    { label: "Pricing", href: "/pricing" },
    { label: "Insights", href: "/blog" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  pages: [
    {
      slug: "home",
      route: "/",
      title: "Home",
      seoTitle: "Fernwood & Co. — clarity for growing organizations",
      seoDescription: "A demo site for a fictional strategy and operations consultancy.",
      blocks: [
        heading("Strategy and operations for teams ready to scale", "h1"),
        rich(
          "<p>Fernwood & Co. helps growing organizations sharpen their strategy and fix" +
            " the operational bottlenecks holding them back. Everything on this page is" +
            " editable in the admin; nothing is hardcoded.</p>",
        ),
        buttons([
          { label: "See our services", href: "/services", variant: "solid" },
          { label: "Book a call", href: "/book", variant: "outline" },
        ]),
        section([
          heading("Why clients work with us", "h2"),
          metric([
            { value: "60+", label: "Engagements delivered" },
            { value: "94%", label: "Client renewal rate" },
            { value: "12wk", label: "Avg. engagement length" },
          ]),
          list([
            "Senior consultants on every engagement, no junior hand-offs",
            "Fixed-scope pricing — no surprise invoices",
            "Playbooks your team keeps after we leave",
          ]),
        ]),
        heading("Recent case studies", "h2"),
        projectList(),
      ],
    },
    {
      slug: "about",
      route: "/about",
      title: "About",
      blocks: [
        heading("A small firm built for focused work", "h1"),
        rich(
          "<p>Fernwood & Co. is a fictional consultancy used to demonstrate this" +
            " platform — swap in your own story from the admin. We're a compact team of" +
            " strategy and operations consultants who work directly with founders and" +
            " leadership teams, not through layers of account managers.</p>",
        ),
        section([
          heading("How we work", "h2"),
          list([
            "Small engagement teams, direct access to senior consultants",
            "Diagnostic first — we don't sell a solution before understanding the problem",
            "Documentation and training so the work outlives the engagement",
          ]),
        ]),
      ],
    },
    {
      slug: "services",
      route: "/services",
      title: "Services",
      blocks: [
        heading("What we do", "h1"),
        rich("<p>Three core service lines, each scoped to a fixed engagement. Sample content below.</p>"),
        section([
          heading("Strategy diagnostics", "h3"),
          rich(
            "<p>A structured review of your market position, org structure, and growth" +
              " levers, delivered as a prioritized roadmap.</p>",
          ),
        ]),
        section([
          heading("Operations redesign", "h3"),
          rich(
            "<p>We map your current-state workflows, find the bottlenecks, and rebuild" +
              " the processes your team actually uses.</p>",
          ),
        ]),
        section([
          heading("Fractional leadership", "h3"),
          rich(
            "<p>An embedded senior consultant who sits in your leadership meetings and" +
              " drives execution week to week.</p>",
          ),
        ]),
        buttons([{ label: "Talk to us about your project", href: "/contact", variant: "solid" }]),
      ],
    },
    {
      slug: "pricing",
      route: "/pricing",
      title: "Pricing",
      template: "landing",
      blocks: [
        heading("Engagement models", "h1"),
        rich("<p>Fixed-scope pricing so there are no surprises. Prices below are sample data.</p>"),
        pricing([
          {
            name: "Diagnostic",
            price: "$6,000",
            cadence: "/engagement",
            features: ["2-week assessment", "Prioritized roadmap", "Executive readout"],
            cta: "Start a diagnostic",
            href: "/contact",
          },
          {
            name: "Advisory Retainer",
            price: "$8,500",
            cadence: "/mo",
            features: ["Ongoing senior advisor", "Monthly strategy sessions", "Priority access"],
            cta: "Start a retainer",
            href: "/contact",
            featured: true,
          },
          {
            name: "Full Engagement",
            price: "Let's talk",
            features: ["Dedicated project team", "Operations redesign", "Custom timeline"],
            cta: "Contact us",
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
        heading("Let's talk about your organization", "h1"),
        rich(
          "<p>Tell us what you're working through, or book time directly on our" +
            " calendar. This is sample content for a fictional consultancy.</p>",
        ),
        buttons([{ label: "Book a call", href: "/book", variant: "solid" }]),
      ],
    },
    {
      slug: "blog",
      route: "/blog",
      title: "Insights",
      template: "article",
      blocks: [
        heading("Insights", "h1"),
        rich("<p>Notes on strategy and operations from our consulting team. Sample posts below.</p>"),
        postList(),
      ],
    },
    {
      slug: "operating-rhythm",
      route: "/blog/operating-rhythm",
      title: "Building an operating rhythm that sticks",
      kind: "post",
      parentSlug: "blog",
      blocks: [
        heading("Building an operating rhythm that sticks", "h1"),
        md(
          "Most operating cadences fail within a quarter because they're **copied from" +
            " another company** instead of built around how your team actually works." +
            " This is sample insights content — edit or delete it.",
        ),
      ],
    },
    {
      slug: "diagnostic-questions",
      route: "/blog/diagnostic-questions",
      title: "Five questions to ask before a reorg",
      kind: "post",
      parentSlug: "blog",
      blocks: [
        heading("Five questions to ask before a reorg", "h1"),
        md("A short checklist we walk every client through before touching the org chart. Sample post."),
      ],
    },
  ],
  entries: [
    {
      type: "project",
      slug: "regional-retailer-turnaround",
      title: "Regional retailer operations turnaround",
      data: {
        tagline: "Redesigned inventory and staffing workflows across 14 store locations.",
        year: "2025",
        tags: ["Operations", "Retail", "Process design"],
      },
      blocks: [
        heading("Regional retailer operations turnaround", "h1"),
        rich(
          "<p>A demo case study. We mapped inventory and staffing workflows across 14" +
            " locations and rebuilt the ones causing the most friction.</p>",
        ),
        metric([
          { value: "23%", label: "Reduction in stockouts" },
          { value: "6wk", label: "Time to rollout" },
        ]),
        rich("<p>Sample outcome: leaner staffing schedules and a shared playbook store managers still use.</p>"),
      ],
    },
    {
      type: "project",
      slug: "saas-gtm-strategy",
      title: "Go-to-market strategy for a growth-stage SaaS company",
      data: {
        tagline: "A repositioning and pricing overhaul ahead of a Series B raise.",
        year: "2025",
        tags: ["Strategy", "SaaS", "Pricing"],
      },
      blocks: [
        heading("Go-to-market strategy for a growth-stage SaaS company", "h1"),
        rich("<p>Sample project. We rebuilt the positioning and pricing model ahead of a fundraise.</p>"),
        metric([
          { value: "31%", label: "Increase in ACV" },
          { value: "3", label: "New segments identified" },
        ]),
      ],
    },
    {
      type: "project",
      slug: "nonprofit-org-redesign",
      title: "Organizational redesign for a regional nonprofit",
      data: {
        tagline: "Clarified reporting lines and decision rights across three departments.",
        year: "2024",
        tags: ["Operations", "Nonprofit", "Org design"],
      },
      blocks: [
        heading("Organizational redesign for a regional nonprofit", "h1"),
        rich(
          "<p>Sample case study. Unclear decision rights were slowing every project down;" +
            " we redrew the org chart and the approval paths behind it.</p>",
        ),
        metric([{ value: "40%", label: "Faster decision cycles" }]),
      ],
    },
  ],
  people: [
    { name: "Marisol Vance", email: "marisol@example.com", kind: "member" },
    { name: "Theo Baptiste", email: "theo@example.com", kind: "subscriber" },
    { name: "Renata Kowalski", email: "renata@example.com", kind: "lead" },
  ],
  eventTypes: [
    {
      slug: "intro-call",
      name: "Intro call (20 min)",
      durationMin: 20,
      priceCents: 0,
      description: "A free introductory call to see if we're a fit. Free bookings work out of the box.",
      locations: ["zoom"],
    },
    {
      slug: "strategy-session",
      name: "Strategy session (60 min)",
      durationMin: 60,
      priceCents: 45000,
      description: "A paid deep-dive strategy session — exercises the paid-booking path (locked until Stripe is configured).",
      locations: ["zoom"],
    },
  ],
};
