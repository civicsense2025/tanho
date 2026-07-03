import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries } from "@/modules/entries/schema";
import { packEntitlements, products, orderItems } from "@/modules/commerce/schema";

export type PackEntitlementRow = typeof packEntitlements.$inferSelect;

export type PackEntitlementWithPack = PackEntitlementRow & {
  packTitle: string;
  packSlug: string;
};

/**
 * All pack entitlements for a person (the buyer), newest first. Joins the
 * linked entry to surface the pack title/slug for display. Used by the
 * "Your purchases" admin screen and the download/install actions.
 */
export async function getUserPackEntitlements(
  personId: string,
): Promise<PackEntitlementWithPack[]> {
  const rows = await db.query.packEntitlements.findMany({
    where: eq(packEntitlements.personId, personId),
    orderBy: [desc(packEntitlements.grantedAt)],
  });
  if (rows.length === 0) return [];
  const entryIds = [...new Set(rows.map((r) => r.packEntryId))];
  const entryRows = await db.query.entries.findMany({
    where: inArray(entries.id, entryIds),
  });
  const byId = new Map(entryRows.map((e) => [e.id, e]));
  return rows.map((r) => {
    const entry = byId.get(r.packEntryId);
    return {
      ...r,
      packTitle: entry?.title ?? "Unknown pack",
      packSlug: entry?.slug ?? "",
    };
  });
}

/** True when the person is entitled to a specific pack. */
export async function hasPackEntitlement(
  personId: string,
  packType: "block_pack" | "design_pack",
  packEntryId: string,
): Promise<boolean> {
  const row = await db.query.packEntitlements.findFirst({
    where: and(
      eq(packEntitlements.personId, personId),
      eq(packEntitlements.packType, packType),
      eq(packEntitlements.packEntryId, packEntryId),
    ),
    columns: { id: true },
  });
  return !!row;
}

/**
 * Grant pack entitlements for a paid order. Called from the Stripe webhook
 * state machine (onCheckoutCompleted) after the order transitions to
 * unfulfilled. Scans the order's line items for pack-linked products and
 * creates an entitlement per pack product when the order has a personId.
 * Idempotent: re-runs on duplicate webhook deliveries are safe because the
 * entitlement rows are inserted with onConflictDoNothing — a duplicate
 * insert is a no-op.
 */
export async function grantEntitlementsForOrder(
  orderId: string,
  personId: string | null,
): Promise<void> {
  if (!personId) return; // guest checkout — no person to entitle
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });
  const productIds = [...new Set(items.map((i) => i.productId).filter((v): v is string => !!v))];
  if (productIds.length === 0) return;
  const packProducts = await db.query.products.findMany({
    where: and(inArray(products.id, productIds), isNotNull(products.packType)),
  });
  if (packProducts.length === 0) return;
  for (const p of packProducts) {
    if (!p.packType || !p.packEntryId) continue;
    await db
      .insert(packEntitlements)
      .values({
        personId,
        packType: p.packType,
        packEntryId: p.packEntryId,
        orderId,
      })
      .onConflictDoNothing();
  }
}
