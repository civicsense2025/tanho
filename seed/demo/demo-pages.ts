import { b, rich } from "./demo-blocks";
import { upsertPage } from "./demo-page-helpers";
import type { SeedDb } from "../lib";

/**
 * Demo home + about pages. The HOME page is built from the dynamic bound
 * blocks so it renders exactly like the design's portfolio homepage: the
 * profile hero, the live project list, then experience / skills / awards /
 * education pulled from the profile singleton.
 */
export async function seedDemoHomeAbout(db: SeedDb): Promise<void> {
  // Home — bound blocks read live profile + entries.
  await upsertPage(db, {
    slug: "home",
    route: "/",
    title: "Tan Ho — designer & maker",
    template: "landing",
    seoTitle: "Tan Ho — designer & independent maker",
    seoDescription:
      "Design, guides, and small software for people who want to own their site.",
    blocks: [
      b("profile-header", { source: "profile" }),
      b("section", {
        width: "contained",
        background: "none",
        py: "lg",
        blocks: [b("project-list", { limit: 6, eyebrow: "Selected work" })],
      }),
      b("section", {
        width: "contained",
        background: "surface",
        py: "lg",
        blocks: [b("experience-list", { source: "experience", eyebrow: "Experience" })],
      }),
      b("section", {
        width: "contained",
        background: "none",
        py: "lg",
        blocks: [b("skills-list", { source: "skills", eyebrow: "What I do" })],
      }),
      b("section", {
        width: "contained",
        background: "surface",
        py: "lg",
        blocks: [
          b("award-list", { source: "awards", eyebrow: "Recognition" }),
          b("education-list", { source: "education", eyebrow: "Education" }),
        ],
      }),
    ],
  });

  // About — long-form prose + a CTA.
  await upsertPage(db, {
    slug: "about",
    route: "/about",
    title: "About",
    template: "article",
    seoTitle: "About Tan Ho",
    seoDescription: "How I work, what I believe about owning your site, and how to get in touch.",
    blocks: [
      b("heading", { text: "About", level: "h1", align: "left" }),
      rich(
        "<p>Tan Ho Studio is a one-person design and software practice in Toronto. I help " +
          "creators and small businesses move off rented platforms and onto tools they " +
          "actually own — without losing their audience, their search rankings, or their nerve.</p>" +
          "<p>The work usually looks like one of three things: a website I design and build, " +
          "a migration I guide you through, or a piece of small software that removes a " +
          "recurring headache. I care about typography, durable systems, and interfaces that " +
          "don't fight the people using them.</p>",
      ),
      b("heading", { text: "How I work", level: "h2", align: "left" }),
      b("list", {
        style: "check",
        items: [
          "Own the outcome, not just the pixels — I ship the whole thing.",
          "Prefer boring, durable tech you can maintain after I'm gone.",
          "Write everything down so you're never locked in.",
        ],
      }),
      b("buttons", {
        align: "left",
        items: [
          { label: "Start a project", href: "/contact", variant: "solid", target: "_self" },
          { label: "Read the guides", href: "/guides", variant: "outline", target: "_self" },
        ],
      }),
    ],
  });
}
