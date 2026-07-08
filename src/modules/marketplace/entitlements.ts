import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries } from "@/modules/entries/schema";
import {
  entitlements,
  orders,
  packEntitlements,
  products,
  orderItems,
} from "@/modules/commerce/schema";
import { sendReviewRequestEmail } from "@/modules/reviews/email";

export type PackEntitlementRow = typeof packEntitlements.$inferSelect;

export type PackEntitlementWithPack = PackEntitlementRow & {
  packTitle: string;
  packSlug: string;
};

const GRANT_TYPE_BY_TARGET: Record<
  string,
  "pack" | "entry" | "membership" | "download" | "course" | "service_booking"
> = {
  pack: "pack",
  entry: "entry",
  membership: "membership",
  download: "download",
};

/**
 * All pack entitlements for a person (the buyer), newest first. Joins the
 * linked entry to surface the pack title/slug for display. Used by the
 * "Your purchases" admin screen and the download/install actions.
 *
 * Reads from BOTH the legacy packEntitlements table AND the new entitlements
 * table (grantType="pack") during the migration window. After 0036 drops
 * packEntitlements, this reads from entitlements only.
 */
export async function getUserPackEntitlements(
  personId: string,
): Promise<PackEntitlementWithPack[]> {
  const [legacyRows, newRows] = await Promise.all([
    db.query.packEntitlements.findMany({
      where: eq(packEntitlements.personId, personId),
      orderBy: [desc(packEntitlements.grantedAt)],
    }),
    db.query.entitlements.findMany({
      where: and(
        eq(entitlements.personId, personId),
        eq(entitlements.grantType, "pack"),
        isNull(entitlements.revokedAt),
        or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, Date.now())),
      ),
      orderBy: [desc(entitlements.grantedAt)],
    }),
  ]);
  if (legacyRows.length === 0 && newRows.length === 0) return [];

  // Collect entry ids from both sources. New rows store "packType:entryId" in
  // grantRef; legacy rows store entryId directly.
  const entryIds = [
    ...new Set([
      ...legacyRows.map((r) => r.packEntryId),
      ...newRows.map((r) => {
        const ref = r.grantRef;
        const colonIdx = ref.indexOf(":");
        return colonIdx >= 0 ? ref.slice(colonIdx + 1) : ref;
      }),
    ]),
  ];
  const entryRows = entryIds.length
    ? await db.query.entries.findMany({ where: inArray(entries.id, entryIds) })
    : [];
  const byId = new Map(entryRows.map((e) => [e.id, e]));

  const toWithPack = (
    id: string,
    personId: string,
    orderId: string,
    packType: "block_pack" | "design_pack",
    packEntryId: string,
    grantedAt: number,
  ): PackEntitlementWithPack => {
    const entry = byId.get(packEntryId);
    return {
      id,
      personId,
      packType,
      packEntryId,
      orderId,
      grantedAt,
      packTitle: entry?.title ?? "Unknown pack",
      packSlug: entry?.slug ?? "",
    };
  };

  return [
    ...legacyRows.map((r) =>
      toWithPack(r.id, r.personId, r.orderId, r.packType, r.packEntryId, r.grantedAt),
    ),
    ...newRows.map((r) => {
      const colonIdx = r.grantRef.indexOf(":");
      const packType = (colonIdx >= 0 ? r.grantRef.slice(0, colonIdx) : "block_pack") as
        | "block_pack"
        | "design_pack";
      const packEntryId = colonIdx >= 0 ? r.grantRef.slice(colonIdx + 1) : r.grantRef;
      return toWithPack(r.id, r.personId, r.orderId, packType, packEntryId, r.grantedAt);
    }),
  ].sort((a, b) => b.grantedAt - a.grantedAt);
}

/** True when the person is entitled to a specific pack. */
export async function hasPackEntitlement(
  personId: string,
  packType: "block_pack" | "design_pack",
  packEntryId: string,
): Promise<boolean> {
  const grantRef = `${packType}:${packEntryId}`;
  // Check the new entitlements table first (the post-migration source of truth).
  const newRow = await db.query.entitlements.findFirst({
    where: and(
      eq(entitlements.personId, personId),
      eq(entitlements.grantType, "pack"),
      eq(entitlements.grantRef, grantRef),
      isNull(entitlements.revokedAt),
      or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, Date.now())),
    ),
    columns: { id: true },
  });
  if (newRow) return true;
  // Fall back to the legacy table during the migration window.
  const legacyRow = await db.query.packEntitlements.findFirst({
    where: and(
      eq(packEntitlements.personId, personId),
      eq(packEntitlements.packType, packType),
      eq(packEntitlements.packEntryId, packEntryId),
    ),
    columns: { id: true },
  });
  return !!legacyRow;
}

/**
 * Grant entitlements for a paid order. Called from the Stripe webhook
 * state machine (onCheckoutCompleted) after the order transitions to
 * unfulfilled. Scans the order's line items for products with an
 * `accessGrantTargetType` and creates an entitlement per grant when the
 * order has a personId. Also writes to the legacy packEntitlements table
 * for backward compat during the migration window.
 *
 * Idempotent: re-runs on duplicate webhook deliveries are safe because the
 * entitlement rows are inserted with onConflictDoNothing — a duplicate
 * insert is a no-op.
 */
export async function grantEntitlementsForOrder(orderId: string): Promise<void> {
  // Derive personId from the order itself — never trust the caller. This
  // prevents IDOR where a future caller could pass their own personId with
  // an arbitrary orderId to grant themselves entitlements they didn't buy.
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    columns: { personId: true },
  });
  const personId = order?.personId;
  if (!personId) return; // guest checkout — no person to entitle
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });
  const productIds = [...new Set(items.map((i) => i.productId).filter((v): v is string => !!v))];
  if (productIds.length === 0) return;
  const orderProducts = await db.query.products.findMany({
    where: inArray(products.id, productIds),
  });
  // A product grants an entitlement when it has accessGrantTargetType set,
  // OR (legacy) when packType is set.
  const grantingProducts = orderProducts.filter(
    (p) => p.accessGrantTargetType || p.packType,
  );
  if (grantingProducts.length === 0) return;

  // Track which products get a FRESH entitlement this run, so the
  // review-request email only fires on a real grant — not a duplicate-webhook
  // no-op. onConflictDoNothing + .returning() makes the email idempotent too.
  const newlyGranted: (typeof products.$inferSelect)[] = [];
  for (const p of grantingProducts) {
    // Resolve the grant descriptor. Legacy pack products use packType/packEntryId;
    // new typed products use accessGrantTargetType/Id.
    let grantType: "pack" | "entry" | "membership" | "download" | "course" | "service_booking";
    let grantRef: string;
    if (p.accessGrantTargetType && p.accessGrantTargetId) {
      grantType = GRANT_TYPE_BY_TARGET[p.accessGrantTargetType] ?? "download";
      // Course products that grant entry access are typed as "course" grants.
      if (p.accessGrantTargetType === "entry" && p.kind === "course") grantType = "course";
      grantRef = p.accessGrantTargetId;
    } else if (p.packType && p.packEntryId) {
      // Legacy pack product (pre-migration): synthesize the new-shape grant.
      grantType = "pack";
      grantRef = `${p.packType}:${p.packEntryId}`;
    } else {
      continue;
    }

    const [row] = await db
      .insert(entitlements)
      .values({
        personId,
        orderId,
        productId: p.id,
        grantType,
        grantRef,
      })
      .onConflictDoNothing()
      .returning({ id: entitlements.id });
    if (row) newlyGranted.push(p);

    // Legacy pack products: also write to packEntitlements during the
    // migration window so old code paths that read only from that table
    // keep working until 0036 drops it.
    if (p.packType && p.packEntryId) {
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

  // Fire review-request emails for freshly granted products. Fire-and-forget:
  // sendReviewRequestEmail never throws, so it can't break the grant.
  if (newlyGranted.length > 0) {
    void Promise.allSettled(
      newlyGranted.map((p) =>
        sendReviewRequestEmail({
          personId,
          targetType: "product",
          targetId: p.id,
          deepLink: `/shop/${p.slug}`,
          targetName: p.name,
        }),
      ),
    );
  }
}
