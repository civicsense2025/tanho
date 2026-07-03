import { upsertEntry } from "./demo-entry-helper";
import { log, type SeedDb } from "../lib";
import { EVALUATIONS } from "./demo-guides-evaluations";
import { DEPLOY_A } from "./demo-guides-deploy-a";
import { DEPLOY_B } from "./demo-guides-deploy-b";
import { FRESH_START } from "./demo-guides-fresh-start";

/**
 * Orchestrator — combines the platform evaluations, the two halves of the
 * stack-deploy guides, and the "starting fresh" guide, then upserts the new
 * platform taxonomy rows and all 11 guides. All filed under the existing
 * "own-your-stack" hub. See demo-guides-stacks-shared.ts for the shared
 * GuideSeed type and sources()/link() helpers, and demo-guides-evaluations.ts
 * / demo-guides-deploy-a.ts / demo-guides-deploy-b.ts / demo-guides-fresh-start.ts
 * for the actual content (split to satisfy the repo's 300-line max).
 *
 * Written in first person — Tan's own voice and judgment calls, not neutral
 * documentation. Every non-obvious factual claim is sourced inline.
 */

export async function seedDemoStackGuides(db: SeedDb): Promise<void> {
  const NEW_PLATFORMS: Array<{ slug: string; name: string; kind: "source" | "target"; category: string }> = [
    { slug: "beehiiv", name: "beehiiv", kind: "source", category: "Newsletter" },
    { slug: "vercel", name: "Vercel", kind: "target", category: "Hosting" },
    { slug: "digitalocean", name: "DigitalOcean", kind: "target", category: "Hosting" },
    { slug: "railway", name: "Railway", kind: "target", category: "Hosting" },
    { slug: "cloudflare-pages", name: "Cloudflare Pages", kind: "target", category: "Hosting" },
    { slug: "hetzner", name: "Hetzner", kind: "target", category: "Hosting" },
    { slug: "supabase", name: "Supabase", kind: "target", category: "Database" },
    { slug: "neon", name: "Neon", kind: "target", category: "Database" },
    { slug: "cloudflare-d1", name: "Cloudflare D1", kind: "target", category: "Database" },
  ];

  let order = 100; // after the existing 15 demo platforms
  for (const p of NEW_PLATFORMS) {
    await upsertEntry(db, "platform", p.slug, p.name, { name: p.name, kind: p.kind, category: p.category }, { sortOrder: order++ });
  }

  const STACKS = [...DEPLOY_A, ...DEPLOY_B];

  order = 100; // after the existing 4 demo guides
  for (const g of [...EVALUATIONS, ...STACKS, FRESH_START]) {
    await upsertEntry(db, "guide", g.slug, g.title, g.data, { sortOrder: order++, blocks: g.blocks });
  }

  log(`demo stack guides seeded (${NEW_PLATFORMS.length} platforms, ${EVALUATIONS.length + STACKS.length + 1} guides)`);
}
