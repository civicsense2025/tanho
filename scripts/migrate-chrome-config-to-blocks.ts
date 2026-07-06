/**
 * migrate-chrome-config-to-blocks.ts — one-time cutover for a site that
 * configured its header/footer/announcement through the OLD config-driven
 * chrome system (settings.header/footer/announcement rows) BEFORE the Phase 3
 * chrome-as-blocks rearchitecture. seedChrome() (seed/modules/chrome.ts) is a
 * deliberate clean-cutover — it only ever seeds a fresh default template and
 * skips entirely if a chrome:header/chrome:footer row already exists, never
 * reading the old settings rows. This script is that explicitly-flagged
 * follow-up (see the "Merge Phase 3 (chrome-as-blocks)" commit's own message).
 *
 * WHAT IT DOES:
 *   - Reads settings.header / settings.footer / settings.announcement (the
 *     OLD config rows — read as loose `unknown`, since the validation module
 *     that used to type them was deleted with Phase 3; this script is the
 *     one place that still needs to understand that historical shape, hence
 *     the recovered types in modules/chrome/config-cutover-map.ts).
 *   - Maps each into an equivalent chrome:header / chrome:footer block tree
 *     (see that module for the full recipe-by-recipe mapping and every
 *     documented fidelity note/gap).
 *   - Resolves each config's `logo.mediaId` to a real `src` URL via the same
 *     `mediaPublicUrl` the old rendering path used.
 *   - Validates the synthesized trees with `validateBlockTree` (the same
 *     fail-closed check saveOwnerBlocks/publishOwnerBlocks use) before
 *     writing, to BOTH the draft and published block_sets variants.
 *   - Writes one `import_receipts` row (source: "chrome-cutover") recording
 *     what was migrated and every fidelity note/gap, mirroring the Ghost
 *     importer's own migration-safety-receipt discipline (that module's
 *     own review-actions.ts is the pattern this one mirrors).
 *
 * GUARD: skips entirely — no writes to block_sets, no receipt — if EITHER
 * chrome:header or chrome:footer already has ANY block_sets row (draft or
 * published). This is a real production-safety rule, not the backfill
 * script's "skip per-item, still visit every item" idiom — an operator who
 * has ALREADY started composing a NEW chrome tree (even a draft, even one
 * row from seedChrome's own default template) must never have this script
 * silently overwrite that in-progress work. Re-running is always a safe
 * no-op once either owner has a real row.
 *
 * READ-ONLY BY DEFAULT: prints exactly what it would write and exits without
 * touching the DB. Pass --write to actually insert the rows + receipt.
 *
 * USAGE
 *   npx tsx -r ./seed/loaders/css-stub.cjs scripts/migrate-chrome-config-to-blocks.ts            # dry run
 *   npx tsx -r ./seed/loaders/css-stub.cjs scripts/migrate-chrome-config-to-blocks.ts --write     # commit
 *
 * The -r ./seed/loaders/css-stub.cjs require hook is needed for the same
 * reason backfill-commerce-blocks.ts needs it — checking the block registry
 * (blockDef, via validateBlockTree) pulls in every block def, several of
 * which import a CSS module at the top level for the Next.js build.
 */
import { and, eq } from "drizzle-orm";
// Pre-resolve settings/validation.ts (and its people-settings.ts import)
// BEFORE anything imports src/blocks/registry.ts below — see
// backfill-commerce-blocks.ts's identical import-order comment for the full
// require-cycle explanation this avoids.
import "../src/modules/settings/validation";
import { validateBlockTree } from "../src/modules/pages/blocks-io";
import { blockSets } from "../src/modules/pages/schema";
import { settings } from "../src/modules/settings/schema";
import { media } from "../src/modules/media/schema";
import { importReceipts } from "../src/modules/importers/ghost/schema";
import { storage } from "../src/adapters/storage";
import {
  mapOldHeaderConfig,
  mapOldFooterConfig,
  mapOldAnnouncementConfig,
  type OldHeaderConfig,
  type OldFooterConfig,
  type OldAnnouncementConfig,
  type MigrationIssue,
} from "../src/modules/chrome/config-cutover-map";
import { seedDb, type SeedDb } from "../seed/lib";

const WRITE = process.argv.includes("--write");
const CHROME_OWNER_ID = "site"; // mirrors modules/chrome/owners.ts's CHROME_OWNER_ID

async function readSettingsRow(db: SeedDb, namespace: string): Promise<unknown> {
  const row = await db.query.settings.findFirst({ where: eq(settings.namespace, namespace) });
  // `data` is declared `mode: "json"` in the schema — drizzle already parses
  // it, so `row.data` is a real object, not a JSON string to re-parse.
  return row?.data ?? null;
}

/** Mirrors modules/fonts/queries.ts's mediaPublicUrl, standalone (no "use
 *  cache" — this script runs once, outside the Next.js request cycle), using
 *  the same `storage.publicUrl()` adapter call rather than reimplementing the
 *  URL format — that call also validates the key and throws on a malformed
 *  one, which a hand-rolled `/api/media/${key}` string would silently skip. */
async function resolveMediaUrl(db: SeedDb, mediaId: string | null): Promise<string | null> {
  if (!mediaId) return null;
  const row = await db.query.media.findFirst({ where: eq(media.id, mediaId) });
  return row ? storage.publicUrl(row.storageKey) : null;
}

/** True if EITHER chrome owner already has any block_sets row — the guard
 *  that makes this script a safe no-op once real chrome-block work exists. */
async function chromeAlreadyStarted(db: SeedDb): Promise<boolean> {
  const header = await db.query.blockSets.findFirst({
    where: and(eq(blockSets.ownerType, "chrome:header"), eq(blockSets.ownerId, CHROME_OWNER_ID)),
    columns: { ownerType: true },
  });
  const footer = await db.query.blockSets.findFirst({
    where: and(eq(blockSets.ownerType, "chrome:footer"), eq(blockSets.ownerId, CHROME_OWNER_ID)),
    columns: { ownerType: true },
  });
  return !!header || !!footer;
}

async function main() {
  console.log(
    `migrate-chrome-config-to-blocks: converting old settings.header/footer/announcement to chrome:header/chrome:footer block trees${WRITE ? "" : " (dry run — pass --write to commit)"}\n`,
  );

  const db = seedDb();

  if (await chromeAlreadyStarted(db)) {
    console.log(
      "chrome:header or chrome:footer already has a block_sets row (draft or published) — nothing to migrate.\n" +
        "This script never overwrites an in-progress or already-seeded chrome tree.",
    );
    return;
  }

  const [oldHeader, oldFooter, oldAnnouncement] = await Promise.all([
    readSettingsRow(db, "header"),
    readSettingsRow(db, "footer"),
    readSettingsRow(db, "announcement"),
  ]);

  if (!oldHeader && !oldFooter && !oldAnnouncement) {
    console.log("No settings.header, settings.footer, or settings.announcement row found — nothing to migrate.");
    return;
  }

  const allIssues: MigrationIssue[] = [];
  let headerBlockCount = 0;
  let footerBlockCount = 0;

  if (oldHeader) {
    const header = oldHeader as OldHeaderConfig;
    const logoUrl = await resolveMediaUrl(db, header.logo.mediaId);
    const { blocks: headerBlocks, issues: headerIssues } = mapOldHeaderConfig(header, logoUrl);
    allIssues.push(...headerIssues);

    const announcementBlocks = oldAnnouncement
      ? mapOldAnnouncementConfig(oldAnnouncement as OldAnnouncementConfig)
      : { blocks: [], issues: [] };
    allIssues.push(...announcementBlocks.issues);

    // Announcement sits as a root sibling of site-header (how templates.ts +
    // the seed compose it — see tree.ts's canNest comment on chrome-root
    // placement), never nested inside it.
    const tree = [...announcementBlocks.blocks, ...headerBlocks];
    const v = validateBlockTree(tree);
    if (!v.ok) {
      console.error(`  ✗ synthesized chrome:header tree failed validation: ${v.error}`);
      allIssues.push({ kind: "header-validation-failed", detail: v.error });
    } else {
      headerBlockCount = v.blocks.length;
      console.log(`chrome:header: ${v.blocks.map((b) => b.type).join(" + ")}${WRITE ? "" : " (dry run)"}`);
      if (WRITE) {
        for (const variant of ["draft", "published"] as const) {
          await db.insert(blockSets).values({ ownerType: "chrome:header", ownerId: CHROME_OWNER_ID, variant, blocks: v.blocks, savedAt: Date.now() });
        }
      }
    }
  } else if (oldAnnouncement) {
    allIssues.push({
      kind: "announcement-orphaned",
      detail: "settings.announcement existed but settings.header did not — announcement has nowhere to attach (it's always a sibling of chrome:header) and was skipped entirely.",
    });
  }

  if (oldFooter) {
    const footer = oldFooter as OldFooterConfig;
    const logoUrl = await resolveMediaUrl(db, footer.logo.mediaId);
    const { blocks: footerBlocks, issues: footerIssues } = mapOldFooterConfig(footer, logoUrl);
    allIssues.push(...footerIssues);

    const v = validateBlockTree(footerBlocks);
    if (!v.ok) {
      console.error(`  ✗ synthesized chrome:footer tree failed validation: ${v.error}`);
      allIssues.push({ kind: "footer-validation-failed", detail: v.error });
    } else {
      footerBlockCount = v.blocks.length;
      console.log(`chrome:footer: ${v.blocks.map((b) => b.type).join(" + ")}${WRITE ? "" : " (dry run)"}`);
      if (WRITE) {
        for (const variant of ["draft", "published"] as const) {
          await db.insert(blockSets).values({ ownerType: "chrome:footer", ownerId: CHROME_OWNER_ID, variant, blocks: v.blocks, savedAt: Date.now() });
        }
      }
    }
  }

  console.log(`\n${allIssues.length} fidelity note(s):`);
  for (const issue of allIssues) {
    console.log(`  [${issue.kind}] ${issue.detail}`);
  }

  if (!WRITE) {
    console.log("\nDry run complete — no rows written. Re-run with --write to commit.");
    return;
  }

  const [receipt] = await db
    .insert(importReceipts)
    .values({
      source: "chrome-cutover",
      tableCounts: { header: headerBlockCount, footer: footerBlockCount },
      // people/membership/redirect counts are genuinely N/A for this
      // migration (it never touches those tables) — left at their real,
      // honest default of 0/[], not a lie, per the receipt schema's own
      // "extensible to future platforms" framing.
      unmapped: allIssues,
    })
    .returning({ id: importReceipts.id });

  const wroteNothing = headerBlockCount === 0 && footerBlockCount === 0;
  console.log(
    `\n${wroteNothing ? "Nothing was migrated (see the fidelity note above)" : "Migration complete"}. Receipt: ${receipt!.id}`,
  );
}

main().catch((err) => {
  console.error("[migrate-chrome-config-to-blocks] failed:", err);
  process.exit(1);
});
