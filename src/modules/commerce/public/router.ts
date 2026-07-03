import {
  getActiveProductBySlug,
  listActiveProducts,
  listVisibleCollections,
  type ProductDetail,
  type StorefrontCollection,
  type StorefrontProduct,
} from "../storefront-queries";
import { getOrderByCode, type OrderSummary } from "../order-lookup";

/**
 * What a /shop URL resolves to. The public catch-all renders the matching
 * template via ShopRouteView, or null falls through to notFound().
 */
export type ShopRoute =
  | {
      kind: "shop-index";
      collections: StorefrontCollection[];
      products: StorefrontProduct[];
      activeCollectionId: string | null;
    }
  | { kind: "product-detail"; product: ProductDetail }
  | { kind: "shop-success"; order: OrderSummary | null };

/**
 * Resolve a site-relative route ("/shop", "/shop/:slug", "/shop/success")
 * to shop content, or null so the catch-all continues to notFound().
 *
 * Server-only: reads the cached storefront query layer. Only status='active'
 * products and visible collections ever surface; the success page reveals
 * only a non-sensitive order status looked up by unguessable code.
 */
export async function resolveShopRoute(
  route: string,
  search?: URLSearchParams,
): Promise<ShopRoute | null> {
  const segments = route.split("/").filter(Boolean);
  if (segments[0] !== "shop") return null;

  // /shop/success?code=... — order confirmation.
  if (segments.length === 2 && segments[1] === "success") {
    const code = search?.get("code") ?? "";
    const order = code ? await getOrderByCode(code) : null;
    return { kind: "shop-success", order };
  }

  // /shop — index: collection filter + active product grid.
  if (segments.length === 1) {
    const activeCollectionId = search?.get("collection") || null;
    const [collections, products] = await Promise.all([
      listVisibleCollections(),
      listActiveProducts(activeCollectionId ?? undefined),
    ]);
    // Reject an unknown/hidden collection filter — fall back to all products.
    const known = activeCollectionId
      ? collections.some((c) => c.id === activeCollectionId)
      : true;
    if (activeCollectionId && !known) {
      return {
        kind: "shop-index",
        collections,
        products: await listActiveProducts(),
        activeCollectionId: null,
      };
    }
    return { kind: "shop-index", collections, products, activeCollectionId };
  }

  // /shop/:slug — product detail.
  if (segments.length === 2) {
    const product = await getActiveProductBySlug(segments[1]);
    return product ? { kind: "product-detail", product } : null;
  }

  return null;
}
