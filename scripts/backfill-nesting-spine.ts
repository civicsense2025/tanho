/**
 * backfill-nesting-spine.ts — one-time cutover that adds the nesting spine
 * (`parent_id` + `path`) to EXISTING `ct_*` content-type tables created before
 * the unbounded-nesting feature.
 *
 * WHY A SCRIPT (not a Drizzle migration): ct_ table names are created at runtime
 * per content type, so a static numbered migration can't know them. Migration
 * 0029 handles the fixed tables (custom_types, redirects); this handles the
 * dynamic ct_ tables. The heavy lifting lives in the idempotent, dialect-aware
 * backfillNestingSpine() (content-schema/backfill-nesting.ts) — this script just
 * runs it so the same logic is reusable from the install flow too.
 *
 * IDEMPOTENT + a no-op after the first run (and on a fresh install).
 *
 * RUN:  npx tsx scripts/backfill-nesting-spine.ts
 */
import { backfillNestingSpine } from "../src/modules/content-schema/backfill-nesting";

async function main() {
  console.log("backfill-nesting-spine: adding parent_id + path to existing ct_* tables\n");
  const { altered, skipped } = await backfillNestingSpine();
  for (const t of altered) console.log(`  ✓ ${t} — nesting spine added + path backfilled`);
  for (const t of skipped) console.log(`  · ${t} — already migrated, skipped`);
  if (altered.length === 0 && skipped.length === 0) {
    console.log("No table-backed content types found — nothing to backfill.");
  }
  console.log(`\nDone: ${altered.length} altered, ${skipped.length} skipped.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
