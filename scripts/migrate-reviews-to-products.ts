/**
 * migrate-reviews-to-products.ts — one-time migration that handles existing
 * non-product reviews now that targetType is restricted to "product" only
 * (migration 0034).
 *
 * WHAT IT DOES:
 *  - Finds all reviews with targetType != "product".
 *  - Prints a summary (count by targetType).
 *  - In WRITE mode: deletes those reviews (and their aggregates) since the
 *    validation layer no longer accepts them. The user confirmed products-only,
 *    so non-product reviews are removed. Back up the DB first.
 *  - Also recomputes or removes the orphaned review_aggregates for those targets.
 *
 * IDEMPOTENT: re-running finds 0 non-product reviews after the first --write run.
 *
 * READ-ONLY BY DEFAULT: prints what it would delete and exits without writing.
 * Pass --write to actually delete the rows.
 *
 * USAGE
 *   npx tsx --env-file-if-exists=.env scripts/migrate-reviews-to-products.ts            # dry run
 *   npx tsx --env-file-if-exists=.env scripts/migrate-reviews-to-products.ts --write     # commit
 *
 * ⚠️  BACK UP YOUR DATABASE BEFORE RUNNING WITH --write. This deletes data.
 */
import { ne } from "drizzle-orm";
import { seedDb, log } from "../seed/lib";
import { reviewAggregates, reviewTargets, reviews } from "../src/modules/reviews/schema";

const WRITE = process.argv.includes("--write");

async function main() {
  const db = seedDb();
  log(WRITE ? "WRITE mode — deleting non-product reviews." : "DRY RUN — no deletes. Pass --write to commit.");

  const nonProductReviews = await db
    .select({
      id: reviews.id,
      targetType: reviews.targetType,
      targetId: reviews.targetId,
      rating: reviews.rating,
    })
    .from(reviews)
    .where(ne(reviews.targetType, "product"));

  log(`Found ${nonProductReviews.length} non-product review(s).`);
  if (nonProductReviews.length === 0) {
    log("Nothing to migrate. Done.");
    return;
  }

  // Summary by targetType
  const byType = new Map<string, number>();
  for (const r of nonProductReviews) {
    byType.set(r.targetType, (byType.get(r.targetType) ?? 0) + 1);
  }
  log("Breakdown by targetType:");
  for (const [type, count] of byType) {
    log(`  ${type}: ${count}`);
  }

  // List a few examples
  const examples = nonProductReviews.slice(0, 10);
  log("Examples:");
  for (const r of examples) {
    log(`  id=${r.id} target=${r.targetType}:${r.targetId} rating=${r.rating}`);
  }
  if (nonProductReviews.length > examples.length) {
    log(`  ... and ${nonProductReviews.length - examples.length} more.`);
  }

  if (!WRITE) {
    log("Dry run complete. Re-run with --write to delete these reviews.");
    return;
  }

  // Collect the non-product target types/ids so we can clean up their aggregates too.
  const nonProductTargets = new Set<string>();
  for (const r of nonProductReviews) {
    nonProductTargets.add(`${r.targetType}:${r.targetId}`);
  }

  // Delete the reviews
  const deletedReviews = await db
    .delete(reviews)
    .where(ne(reviews.targetType, "product"))
    .returning({ id: reviews.id });
  log(`Deleted ${deletedReviews.length} review row(s).`);

  // Delete orphaned review_aggregates for non-product targets
  const deletedAggregates = await db
    .delete(reviewAggregates)
    .where(ne(reviewAggregates.targetType, "product"))
    .returning({ targetType: reviewAggregates.targetType });
  log(`Deleted ${deletedAggregates.length} orphaned review_aggregates row(s).`);

  // Also clean up review_targets config rows for non-product targets
  const deletedTargets = await db
    .delete(reviewTargets)
    .where(ne(reviewTargets.targetType, "product"))
    .returning({ targetType: reviewTargets.targetType });
  log(`Deleted ${deletedTargets.length} non-product review_targets config row(s).`);

  log("Migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
