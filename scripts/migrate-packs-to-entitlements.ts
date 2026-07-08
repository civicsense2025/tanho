/**
 * migrate-packs-to-entitlements.ts — one-time migration that backfills the
 * new typed-product columns + general `entitlements` table from the legacy
 * `packType`/`packEntryId` columns + `packEntitlements` table.
 *
 * WHAT IT DOES:
 *  1. For each product with packType non-null:
 *     - kind = "digital"
 *     - fulfillmentMode = "download"
 *     - accessGrantTargetType = "pack"
 *     - accessGrantTargetId = "${packType}:${packEntryId}"
 *     - taxCode = "txcd_10103000" (SaaS personal — the digital default)
 *  2. For each row in packEntitlements: insert into entitlements with
 *     grantType="pack", grantRef="${packType}:${packEntryId}".
 *
 * IDEMPOTENT: skips products already migrated (kind != "physical" OR
 * accessGrantTargetType already set) and entitlements rows that already exist
 * (onConflictDoNothing on the unique index).
 *
 * READ-ONLY BY DEFAULT: prints what it would do and exits without writing.
 * Pass --write to actually commit the changes.
 *
 * USAGE
 *   npx tsx --env-file-if-exists=.env scripts/migrate-packs-to-entitlements.ts            # dry run
 *   npx tsx --env-file-if-exists=.env scripts/migrate-packs-to-entitlements.ts --write     # commit
 */
import { and, eq, isNotNull } from "drizzle-orm";
import { seedDb, log, type SeedDb } from "../seed/lib";
import { entitlements, packEntitlements, products } from "../src/modules/commerce/schema";

const WRITE = process.argv.includes("--write");

async function migrateProductKinds(db: SeedDb) {
  const packProducts = await db.query.products.findMany({
    where: isNotNull(products.packType),
  });
  log(`Found ${packProducts.length} product(s) with legacy packType.`);
  if (packProducts.length === 0) return;

  let toMigrate = 0;
  let alreadyMigrated = 0;
  for (const p of packProducts) {
    if (!p.packType || !p.packEntryId) continue;
    // Skip if already migrated (accessGrantTargetType already set to "pack").
    if (p.accessGrantTargetType === "pack" && p.accessGrantTargetId) {
      alreadyMigrated++;
      continue;
    }
    toMigrate++;
    const accessGrantTargetId = `${p.packType}:${p.packEntryId}`;
    if (WRITE) {
      await db
        .update(products)
        .set({
          kind: "digital",
          fulfillmentMode: "download",
          accessGrantTargetType: "pack",
          accessGrantTargetId,
          taxCode: p.taxCode ?? "txcd_10103000",
          updatedAt: Date.now(),
        })
        .where(eq(products.id, p.id));
    }
    log(
      `  ${WRITE ? "migrated" : "would migrate"} product ${p.slug} (${p.id}): kind=digital, grant=pack:${accessGrantTargetId}`,
    );
  }
  log(`Products: ${toMigrate} ${WRITE ? "migrated" : "to migrate"}, ${alreadyMigrated} already done.`);
}

async function migrateEntitlementRows(db: SeedDb) {
  const legacyRows = await db.select().from(packEntitlements);
  log(`Found ${legacyRows.length} legacy pack_entitlements row(s).`);
  if (legacyRows.length === 0) return;

  let inserted = 0;
  let skipped = 0;
  for (const r of legacyRows) {
    const grantRef = `${r.packType}:${r.packEntryId}`;
    // Find the product that granted this entitlement (by packType+packEntryId).
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.packType, r.packType),
        eq(products.packEntryId, r.packEntryId),
      ),
      columns: { id: true },
    });
    if (!product) {
      log(`  WARNING: no product found for pack ${grantRef} (entitlement row ${r.id}) — skipping.`);
      skipped++;
      continue;
    }
    if (WRITE) {
      const [row] = await db
        .insert(entitlements)
        .values({
          personId: r.personId,
          orderId: r.orderId,
          productId: product.id,
          grantType: "pack",
          grantRef,
          grantedAt: r.grantedAt,
        })
        .onConflictDoNothing()
        .returning({ id: entitlements.id });
      if (row) inserted++;
    } else {
      log(`  would insert entitlement: person=${r.personId}, grant=pack:${grantRef}, order=${r.orderId}`);
    }
    if (!WRITE) inserted++;
  }
  log(`Entitlements: ${inserted} ${WRITE ? "inserted" : "to insert"}, ${skipped} skipped (orphaned).`);
}

async function main() {
  const db = seedDb();
  log(WRITE ? "WRITE mode — committing changes." : "DRY RUN — no writes. Pass --write to commit.");
  await migrateProductKinds(db);
  await migrateEntitlementRows(db);
  log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
