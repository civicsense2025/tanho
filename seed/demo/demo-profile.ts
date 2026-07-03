import { eq } from "drizzle-orm";
import { profile } from "../../src/modules/profile/schema";
import type {
  AwardItem,
  EducationItem,
  ExperienceItem,
  SkillGroup,
} from "../../src/modules/profile/schema";
import { log, type SeedDb } from "../lib";

/**
 * Demo profile — the "Tan Ho" résumé from the design's data.js PORTFOLIO.
 * Feeds the profile-header hero and the experience/skills/awards/education
 * bound blocks on the home page. Overwrites the singleton so the demo is
 * authoritative and re-running is a no-op.
 */

const BIO =
  "I'm Tan Ho — a designer and independent maker in Toronto. I build small, " +
  "durable software and write field notes for people who'd rather own their " +
  "website than rent it. Most of my work lives at the seam between design and " +
  "engineering: page builders, content tools, and the unglamorous plumbing that " +
  "lets a one-person studio run like a much bigger one. Before going independent " +
  "I led design and front-end at a couple of small product teams. These days I " +
  "split my time between client work, the guides on this site, and a tiny shop of " +
  "riso prints. If you're trying to move off a hosted platform and keep your name, " +
  "your data, and your audience, that's exactly what I like to help with.";

const EXPERIENCE: ExperienceItem[] = [
  {
    span: "2021 — now",
    role: "Independent designer & maker",
    org: "Tan Ho Studio",
    note: "Design and build white-label site tooling, publish migration guides, and run a small print shop.",
  },
  {
    span: "2018 — 2021",
    role: "Design lead",
    org: "Fieldhouse",
    note: "Owned the design system and front-end for a civic-data product; shipped the public site and admin.",
  },
  {
    span: "2015 — 2018",
    role: "Product designer",
    org: "Northsable",
    note: "Designed onboarding and billing flows; introduced the team's first component library.",
  },
  {
    span: "2013 — 2015",
    role: "Front-end developer",
    org: "Freelance",
    note: "Built marketing sites and small CMS-backed projects for studios and non-profits.",
  },
];

const SKILLS: SkillGroup[] = [
  { group: "Design", items: ["Design systems", "Typography", "Brand", "Editorial layout", "Prototyping"] },
  { group: "Build", items: ["TypeScript", "React", "Next.js", "Node", "SQLite / libSQL", "CSS architecture"] },
  { group: "Content", items: ["Writing", "Guides & docs", "SEO", "Newsletters"] },
  { group: "Tools", items: ["Figma", "Stripe", "Drizzle", "Vercel", "Riso printing"] },
];

const AWARDS: AwardItem[] = [
  { title: "Site of the Day", org: "Awwwards", year: "2023", tone: "accent" },
  { title: "Typography feature", org: "Type Directors Club", year: "2022", tone: "accent2" },
  { title: "Independent Maker grant", org: "Small Web Fund", year: "2022", tone: "accent" },
  { title: "Print showcase", org: "Riso Club Toronto", year: "2021", tone: "accent2" },
];

const EDUCATION: EducationItem[] = [
  { span: "2009 — 2013", school: "OCAD University", degree: "BDes, Graphic Design" },
  { span: "2019", school: "Recurse Center", degree: "Programming residency" },
];

export async function seedDemoProfile(db: SeedDb): Promise<void> {
  const values = {
    id: "profile",
    name: "Tan Ho",
    bio: BIO,
    avatarMediaId: null,
    experience: EXPERIENCE,
    skills: SKILLS,
    awards: AWARDS,
    education: EDUCATION,
    updatedAt: Date.now(),
  };
  const existing = await db.query.profile.findFirst();
  if (existing) {
    await db.update(profile).set(values).where(eq(profile.id, "profile"));
  } else {
    await db.insert(profile).values(values);
  }
  log("demo profile seeded (Tan Ho résumé)");
}
