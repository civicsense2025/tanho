import { createId } from "@paralleldrive/cuid2";
import { entries } from "../../src/modules/entries/schema";
import { get as getEntitySchema } from "../../src/entities/registry";
import { log, type SeedDb } from "../lib";

/**
 * Neutral guides taxonomy — brand-agnostic product structure only. The six
 * "own your ___" hubs, a starter set of source/target platforms, and a sparse
 * roadmap matrix. NO guides, resources, or projects are seeded: their empty
 * states are part of the design and must look good out of the box.
 */

const HUBS: Array<{ slug: string; title: string; tagline: string }> = [
  {
    slug: "own-your-stack",
    title: "Own your stack",
    tagline: "Move off rented tools and run your own software.",
  },
  {
    slug: "own-your-data",
    title: "Own your data",
    tagline: "Export, back up, and control the information that's yours.",
  },
  {
    slug: "own-your-domain",
    title: "Own your domain",
    tagline: "Put your name on an address no platform can take away.",
  },
  {
    slug: "own-your-audience",
    title: "Own your audience",
    tagline: "Reach your people directly instead of renting an algorithm.",
  },
  {
    slug: "own-your-money",
    title: "Own your money",
    tagline: "Take payments and keep more of what you earn.",
  },
  {
    slug: "own-your-code",
    title: "Own your code",
    tagline: "Host, version, and control the code you depend on.",
  },
];

/** 15 platforms — neutral category labels, no vendor names. */
const PLATFORMS: Array<{
  slug: string;
  name: string;
  kind: "source" | "target";
  category: string;
}> = [
  { slug: "hosted-site-builder", name: "Hosted site builder", kind: "source", category: "Website" },
  { slug: "hosted-blog", name: "Hosted blog", kind: "source", category: "Publishing" },
  { slug: "social-network", name: "Social network", kind: "source", category: "Audience" },
  { slug: "video-platform", name: "Video platform", kind: "source", category: "Media" },
  { slug: "newsletter-service", name: "Newsletter service", kind: "source", category: "Email" },
  { slug: "marketplace", name: "Online marketplace", kind: "source", category: "Commerce" },
  { slug: "cloud-notes", name: "Cloud notes app", kind: "source", category: "Data" },
  { slug: "managed-store", name: "Managed store platform", kind: "source", category: "Commerce" },
  { slug: "self-hosted-cms", name: "Self-hosted CMS", kind: "target", category: "Website" },
  { slug: "static-site", name: "Static site host", kind: "target", category: "Website" },
  { slug: "own-newsletter", name: "Self-run newsletter", kind: "target", category: "Email" },
  { slug: "own-domain", name: "Custom domain", kind: "target", category: "Identity" },
  { slug: "self-hosted-store", name: "Self-hosted store", kind: "target", category: "Commerce" },
  { slug: "object-storage", name: "Object storage", kind: "target", category: "Data" },
  { slug: "code-forge", name: "Self-hosted code forge", kind: "target", category: "Code" },
];

/** 7 matrix pairs — sparse roadmap for the flagship hub. */
const MATRIX_PAIRS: Array<{
  source: string;
  target: string;
  matrixStatus: "live" | "planned";
}> = [
  { source: "hosted-site-builder", target: "self-hosted-cms", matrixStatus: "planned" },
  { source: "hosted-site-builder", target: "static-site", matrixStatus: "planned" },
  { source: "hosted-blog", target: "self-hosted-cms", matrixStatus: "planned" },
  { source: "newsletter-service", target: "own-newsletter", matrixStatus: "planned" },
  { source: "managed-store", target: "self-hosted-store", matrixStatus: "planned" },
  { source: "cloud-notes", target: "object-storage", matrixStatus: "planned" },
  { source: "social-network", target: "own-domain", matrixStatus: "planned" },
];

/** Validate a data payload against its entity schema before inserting. */
function validate(type: string, data: unknown): Record<string, unknown> {
  const schema = getEntitySchema(type);
  if (!schema) throw new Error(`seed: unknown entity type ${type}`);
  return schema.dataSchema.parse(data) as Record<string, unknown>;
}

export async function seedEntries(db: SeedDb): Promise<void> {
  const existing = await db.query.entries.findFirst();
  if (existing) {
    log("entries: content already exists — skipping guides taxonomy seed");
    return;
  }

  let order = 0;
  const rows: Array<typeof entries.$inferInsert> = [];

  for (const h of HUBS) {
    rows.push({
      id: createId(),
      type: "hub",
      slug: h.slug,
      title: h.title,
      status: "published",
      sortOrder: order++,
      data: validate("hub", { tagline: h.tagline }),
    });
  }

  order = 0;
  for (const p of PLATFORMS) {
    rows.push({
      id: createId(),
      type: "platform",
      slug: p.slug,
      title: p.name,
      status: "published",
      sortOrder: order++,
      data: validate("platform", { name: p.name, kind: p.kind, category: p.category }),
    });
  }

  order = 0;
  for (const m of MATRIX_PAIRS) {
    rows.push({
      id: createId(),
      type: "matrix_pair",
      slug: `${m.source}--${m.target}`,
      title: `${m.source} → ${m.target}`,
      status: "published",
      sortOrder: order++,
      data: validate("matrix_pair", {
        source: m.source,
        target: m.target,
        matrixStatus: m.matrixStatus,
      }),
    });
  }

  await db.insert(entries).values(rows);
  log(`entries seeded: ${HUBS.length} hubs, ${PLATFORMS.length} platforms, ${MATRIX_PAIRS.length} matrix pairs`);
}
