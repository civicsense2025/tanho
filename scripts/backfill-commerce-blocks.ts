/**
 * backfill-commerce-blocks.ts — one-time migration that gives every existing
 * product and collection a starter block_sets row, synthesized from its
 * current structured fields.
 *
 * WHY: products/collections predate the block-body editor added alongside
 * this script (see ProductForm's "Edit content" / CollectionSheet's "Edit
 * content"). A row created before that change has no block_sets row at all,
 * so opening its content editor would show an empty canvas even though the
 * product/collection clearly has content today (its `description`, and for
 * products its `images`). This script converts that existing content into
 * a real starter block tree so nothing is lost when an owner starts editing.
 *
 * WHAT IT DOES, per product/collection with no existing block_sets row:
 *   - description (non-empty) -> one `richtext` block. The description is
 *     put in the block's `html` field (not `md`) so it renders through the
 *     exact same sanitizer path (sanitizeRichHtml) the product/collection
 *     page already uses today — putting it in `md` would re-parse it as
 *     Markdown first and could visibly change the output.
 *   - images (products only, non-empty) -> one `gallery` block, one image
 *     per gallery item. Skipped if the `gallery` block type isn't
 *     registered (see src/blocks/registry.ts) — checked at runtime rather
 *     than assumed, since block registration is data this script doesn't own.
 *   - Both blocks together validated via the same validateBlockTree used by
 *     saveOwnerBlocks/publishOwnerBlocks, then written to BOTH the draft and
 *     published block_sets variants (so the storefront renders the
 *     backfilled content immediately, and the admin content editor opens
 *     showing an already-published, not-dirty draft).
 *
 * A product/collection with an empty description AND no images (products)
 * gets no row at all — an empty starter tree isn't meaningfully better than
 * no row, and leaving it absent keeps `getProductForEdit`/
 * `getCollectionForEdit`'s documented empty-array fallback exercised.
 *
 * IDEMPOTENT: any product/collection that already has a block_sets row
 * (draft OR published) for its owner is skipped outright — re-running never
 * overwrites content once a row exists, including content this script itself
 * wrote on a prior run.
 *
 * READ-ONLY BY DEFAULT: prints what it would create and exits without
 * writing. Pass --write to actually insert the rows.
 *
 * The -r ./seed/loaders/css-stub.cjs require hook is needed because checking
 * the block registry (blockDef) pulls in every block def, and some Render
 * components import a CSS module at the top level for the Next.js build —
 * the same reason seed/neutral.ts and seed/demo-tanho.ts load it.
 *
 * USAGE
 *   npx tsx -r ./seed/loaders/css-stub.cjs scripts/backfill-commerce-blocks.ts            # dry run, no writes
 *   npx tsx -r ./seed/loaders/css-stub.cjs scripts/backfill-commerce-blocks.ts --write     # commit the backfill
 */
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
// Pre-resolve settings/validation.ts (and its people-settings.ts import)
// BEFORE anything imports src/blocks/registry.ts below. There's a pre-existing
// require cycle (newsletter block -> SubscribeForm -> newsletter-actions ->
// people-settings.ts <-> settings/validation.ts) that only breaks under a
// bare CJS `require()` graph like tsx's — Next.js's bundler tolerates it, but
// this script is (as far as this repo's scripts/seed/ go) the first standalone
// script to import the block registry, so it's the first to hit it. Loading
// this side of the cycle to completion first, before `blockDef` starts
// walking the registry, avoids a "Cannot access before initialization" crash.
// This is unrelated to the backfill logic below — a real fix belongs in the
// people/newsletter <-> settings modules, not here.
import "../src/modules/settings/validation";
import { blockDef } from "../src/blocks/registry";
import type { BlockNode } from "../src/blocks/types";
import { validateBlockTree } from "../src/modules/pages/blocks-io";
import { blockSets } from "../src/modules/pages/schema";
import { seedDb, log, type SeedDb } from "../seed/lib";

const WRITE = process.argv.includes("--write");

const block = (type: string, content: Record<string, unknown>): BlockNode => ({
  id: `b_${createId()}`,
  type,
  content,
});

/** True if this owner already has ANY block_sets row (draft or published). */
async function hasBlockSet(db: SeedDb, ownerType: string, ownerId: string): Promise<boolean> {
  const row = await db.query.blockSets.findFirst({
    where: and(eq(blockSets.ownerType, ownerType), eq(blockSets.ownerId, ownerId)),
    columns: { ownerType: true },
  });
  return !!row;
}

/** Writes the synthesized tree to BOTH draft + published variants. */
async function writeBlockSets(
  db: SeedDb,
  ownerType: string,
  ownerId: string,
  blocks: BlockNode[],
): Promise<void> {
  for (const variant of ["draft", "published"] as const) {
    await db.insert(blockSets).values({ ownerType, ownerId, variant, blocks, savedAt: Date.now() });
  }
}

async function backfillProducts(db: SeedDb): Promise<{ created: number; skipped: number }> {
  const hasGallery = Boolean(blockDef("gallery"));
  let created = 0;
  let skipped = 0;

  for (const p of await db.query.products.findMany()) {
    if (await hasBlockSet(db, "product", p.id)) {
      skipped++;
      continue;
    }

    const blocks: BlockNode[] = [];
    if (p.description.trim()) blocks.push(block("richtext", { md: "", html: p.description }));
    if (hasGallery && p.images.length > 0) {
      blocks.push(
        block("gallery", {
          cols: 3,
          images: p.images.map((src) => ({ src, alt: "", caption: "" })),
        }),
      );
    }

    if (blocks.length === 0) {
      log(`product "${p.name}" (${p.id}): no description or images — nothing to backfill, no row created`);
      continue;
    }

    const v = validateBlockTree(blocks);
    if (!v.ok) {
      console.error(`  ✗ product "${p.name}" (${p.id}): synthesized tree failed validation: ${v.error}`);
      continue;
    }

    log(`product "${p.name}" (${p.id}): ${v.blocks.map((b) => b.type).join(" + ")}${WRITE ? "" : " (dry run)"}`);
    if (WRITE) await writeBlockSets(db, "product", p.id, v.blocks);
    created++;
  }

  return { created, skipped };
}

async function backfillCollections(db: SeedDb): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const c of await db.query.collections.findMany()) {
    if (await hasBlockSet(db, "collection", c.id)) {
      skipped++;
      continue;
    }

    if (!c.description.trim()) {
      log(`collection "${c.name}" (${c.id}): no description — nothing to backfill, no row created`);
      continue;
    }

    const blocks = [block("richtext", { md: "", html: c.description })];
    const v = validateBlockTree(blocks);
    if (!v.ok) {
      console.error(`  ✗ collection "${c.name}" (${c.id}): synthesized tree failed validation: ${v.error}`);
      continue;
    }

    log(`collection "${c.name}" (${c.id}): ${v.blocks.map((b) => b.type).join(" + ")}${WRITE ? "" : " (dry run)"}`);
    if (WRITE) await writeBlockSets(db, "collection", c.id, v.blocks);
    created++;
  }

  return { created, skipped };
}

async function main() {
  console.log(`backfill-commerce-blocks: synthesizing starter block_sets${WRITE ? "" : " (dry run — pass --write to commit)"}\n`);

  const db = seedDb();

  console.log("Products:");
  const productResult = await backfillProducts(db);
  console.log(`  ${productResult.created} ${WRITE ? "backfilled" : "would be backfilled"}, ${productResult.skipped} already had a block_sets row (skipped)\n`);

  console.log("Collections:");
  const collectionResult = await backfillCollections(db);
  console.log(`  ${collectionResult.created} ${WRITE ? "backfilled" : "would be backfilled"}, ${collectionResult.skipped} already had a block_sets row (skipped)\n`);

  if (!WRITE) {
    console.log("Dry run complete — no rows written. Re-run with --write to commit.");
  } else {
    console.log("Backfill complete.");
  }
}

main().catch((err) => {
  console.error("[backfill-commerce-blocks] failed:", err);
  process.exit(1);
});
