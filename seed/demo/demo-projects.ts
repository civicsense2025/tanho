import { eq } from "drizzle-orm";
import { entries } from "../../src/modules/entries/schema";
import { projectDataSchema } from "../../src/entities/schemas/project";
import { log, type SeedDb } from "../lib";
import { b, rich, putBlockSets, type Block } from "./demo-blocks";

type ProjectSeed = {
  slug: string;
  title: string;
  data: Record<string, unknown>;
  blocks: Block[];
};

/**
 * Demo projects — the 3 portfolio case studies from data.js. Each is an
 * entry of type "project"; its legacy overview/metrics/body/learnings/
 * changelog/citations are reproduced as real blocks (richtext/metric/list/
 * timeline/buttons) in a block_set under ownerType `entry:project`.
 */
const PROJECTS: ProjectSeed[] = [
  {
    slug: "fiveable",
    title: "Fiveable",
    data: {
      tagline: "A study platform that scaled to millions of students.",
      year: "2020",
      live_url: "https://fiveable.me",
      github_url: "",
      tags: ["Product design", "Design system", "EdTech"],
    },
    blocks: [
      b("heading", { text: "Fiveable", level: "h1", align: "left" }),
      rich(
        "<p>Fiveable is a study platform for high-school students. I helped shape the product " +
          "design and the design system that let a small team ship consistently while the " +
          "audience grew into the millions.</p>",
      ),
      b("metric", {
        cols: 3,
        items: [
          { value: "3M+", label: "Students" },
          { value: "40+", label: "Subjects" },
          { value: "1", label: "Design system" },
        ],
      }),
      b("heading", { text: "What I did", level: "h2", align: "left" }),
      rich(
        "<p>Owned the component library and the live-stream study experience, and set the " +
          "typographic system that carried across web and mobile.</p>",
      ),
      b("heading", { text: "What I learned", level: "h2", align: "left" }),
      b("list", {
        style: "check",
        items: [
          "A design system pays for itself the moment the team outgrows one designer.",
          "Students will forgive rough edges; they won't forgive slow.",
          "Accessibility is a growth feature, not a checkbox.",
        ],
      }),
      b("timeline", {
        items: [
          { date: "2019", title: "Joined", note: "First component library." },
          { date: "2020", title: "Scaled", note: "Live study streams during exam season." },
          { date: "2021", title: "Handoff", note: "System documented and handed to the team." },
        ],
      }),
      b("buttons", {
        align: "left",
        items: [{ label: "Visit Fiveable", href: "https://fiveable.me", variant: "solid", target: "_blank" }],
      }),
    ],
  },
  {
    slug: "hours",
    title: "Hours",
    data: {
      tagline: "A tiny time tracker for people who hate time trackers.",
      year: "2022",
      live_url: "https://hours.tanho.studio",
      github_url: "https://github.com/tanho/hours",
      tags: ["Product", "Indie software", "SwiftUI"],
    },
    blocks: [
      b("heading", { text: "Hours", level: "h1", align: "left" }),
      rich(
        "<p>Hours is a deliberately small time tracker. One button, no projects to configure, " +
          "no dashboards. It exists because every other tracker asked me to do bookkeeping " +
          "before I'd tracked a single minute.</p>",
      ),
      b("metric", {
        cols: 3,
        items: [
          { value: "1", label: "Button" },
          { value: "0", label: "Accounts required" },
          { value: "4.8", label: "App Store rating" },
        ],
      }),
      b("heading", { text: "Design notes", level: "h2", align: "left" }),
      rich(
        "<p>The whole app is one screen. Data lives on the device. There's an export, and " +
          "that's the extent of its ambitions — which is the point.</p>",
      ),
      b("list", {
        style: "check",
        items: [
          "Constraints are a feature: saying no to settings kept it usable.",
          "Local-first meant no server to run and nothing to leak.",
          "Shipping small let me maintain it as a side project for years.",
        ],
      }),
      b("timeline", {
        items: [
          { date: "2022", title: "1.0", note: "Shipped on iOS." },
          { date: "2023", title: "Widgets", note: "Lock-screen tracking." },
        ],
      }),
      b("buttons", {
        align: "left",
        items: [
          { label: "Try Hours", href: "https://hours.tanho.studio", variant: "solid", target: "_blank" },
          { label: "Source", href: "https://github.com/tanho/hours", variant: "outline", target: "_blank" },
        ],
      }),
    ],
  },
  {
    slug: "field-notes",
    title: "Field Notes",
    data: {
      tagline: "The guides and newsletter that became this studio.",
      year: "2023",
      live_url: "",
      github_url: "",
      tags: ["Writing", "Content", "SEO"],
    },
    blocks: [
      b("heading", { text: "Field Notes", level: "h1", align: "left" }),
      rich(
        "<p>Field Notes is the body of writing that turned a freelance practice into a studio. " +
          "It's the guides, the newsletter, and the small tools that grew out of answering the " +
          "same questions over and over.</p>",
      ),
      b("metric", {
        cols: 3,
        items: [
          { value: "20+", label: "Guides" },
          { value: "4k", label: "Subscribers" },
          { value: "#1", label: "For key searches" },
        ],
      }),
      b("heading", { text: "Why it worked", level: "h2", align: "left" }),
      b("list", {
        style: "check",
        items: [
          "Writing the guide once beat answering the email fifty times.",
          "Owning the newsletter list meant owning the audience.",
          "The content became the best sales channel I have.",
        ],
      }),
      b("timeline", {
        items: [
          { date: "2023", title: "First guide", note: "Squarespace → Ghost." },
          { date: "2024", title: "Newsletter", note: "Crossed a few thousand readers." },
        ],
      }),
    ],
  },
];

export async function seedDemoProjects(db: SeedDb): Promise<void> {
  let order = 0;
  for (const p of PROJECTS) {
    const data = projectDataSchema.parse(p.data);
    const existing = await db.query.entries.findFirst({
      where: (e, { and, eq: eqf }) => and(eqf(e.type, "project"), eqf(e.slug, p.slug)),
    });
    let id: string;
    const row = {
      type: "project",
      slug: p.slug,
      title: p.title,
      status: "published" as const,
      sortOrder: order,
      data,
      updatedAt: Date.now(),
    };
    if (existing) {
      await db.update(entries).set(row).where(eq(entries.id, existing.id));
      id = existing.id;
    } else {
      const [ins] = await db.insert(entries).values(row).returning({ id: entries.id });
      id = ins.id;
    }
    await putBlockSets(db, "entry:project", id, p.blocks);
    order += 1;
  }
  log(`demo projects seeded (${PROJECTS.length})`);
}
