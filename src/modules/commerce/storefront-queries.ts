import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  collections,
  productCollections,
  productVariants,
  products,
  shippingZones,
} from "./schema";

export type StorefrontProduct = typeof products.$inferSelect;
export type StorefrontVariant = typeof productVariants.$inferSelect;
export type StorefrontCollection = typeof collections.$inferSelect;
export type StorefrontZone = typeof shippingZones.$inferSelect;

export type ProductDetail = StorefrontProduct & {
  variants: StorefrontVariant[];
  collections: StorefrontCollection[];
};

// Re-exported for server components already importing it from here. Client
// components must import from ./format-money directly (this module holds
// "use cache" queries and can't be pulled into a client bundle).
export { formatMoney } from "./format-money";

/**
 * Active products for the grid, newest-priced first by name. Only status
 * 'active' ever reaches the storefront; an optional collectionId narrows to
 * that collection's members. Cached — invalidated by the "products" tag.
 */
export async function listActiveProducts(
  collectionId?: string,
): Promise<StorefrontProduct[]> {
  "use cache";
  cacheLife("max");
  cacheTag("products", "storefront");

  if (collectionId) {
    const links = await db.query.productCollections.findMany({
      where: eq(productCollections.collectionId, collectionId),
    });
    const ids = links.map((l) => l.productId);
    if (ids.length === 0) return [];
    return db.query.products.findMany({
      where: and(eq(products.status, "active"), inArray(products.id, ids)),
      orderBy: [asc(products.name)],
    });
  }

  return db.query.products.findMany({
    where: eq(products.status, "active"),
    orderBy: [asc(products.name)],
  });
}

/** One active product by slug, with variants + visible collections — cached. */
export async function getActiveProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("max");
  cacheTag("products", "storefront");

  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "active")),
  });
  if (!product) return null;

  const variants = await db.query.productVariants.findMany({
    where: eq(productVariants.productId, product.id),
  });

  const links = await db.query.productCollections.findMany({
    where: eq(productCollections.productId, product.id),
  });
  const collIds = links.map((l) => l.collectionId);
  const cols = collIds.length
    ? await db.query.collections.findMany({
        where: and(inArray(collections.id, collIds), eq(collections.visible, true)),
        orderBy: [asc(collections.name)],
      })
    : [];

  return { ...product, variants, collections: cols };
}

/** Visible collections for the filter pills — cached. */
export async function listVisibleCollections(): Promise<StorefrontCollection[]> {
  "use cache";
  cacheLife("max");
  cacheTag("products", "storefront");
  return db.query.collections.findMany({
    where: eq(collections.visible, true),
    orderBy: [asc(collections.name)],
  });
}

/** All shipping zones (rate rules live server-side) — cached. */
export async function getShippingZones(): Promise<StorefrontZone[]> {
  "use cache";
  cacheLife("max");
  cacheTag("products", "storefront");
  return db.query.shippingZones.findMany({
    orderBy: [asc(shippingZones.name)],
  });
}
