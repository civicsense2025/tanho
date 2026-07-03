import type { StorefrontProduct, StorefrontVariant, StorefrontZone } from "./storefront-queries";

export type CheckoutRequestItem = { productId: string; variantId?: string; qty: number };

export type PricedItem = {
  productId: string;
  variantId: string | null;
  name: string;
  qty: number;
  unitCents: number;
};

export type PriceError =
  | { code: "unknown_product"; productId: string }
  | { code: "unknown_variant"; productId: string; variantId: string }
  | { code: "bad_qty"; productId: string }
  | { code: "insufficient_stock"; productId: string; available: number };

/**
 * Compute one line's server-trusted unit price and validate quantity/stock.
 * The unit price comes from the DB product/variant — NEVER from the client.
 * A variant price overrides the base product price. Returns the priced line
 * or a structured error; callers map errors to a user message.
 *
 * Pure: no DB, no I/O — unit-testable in isolation (see checkout-pricing.test).
 */
export function priceLineItem(
  req: CheckoutRequestItem,
  product: StorefrontProduct | undefined,
  variant: StorefrontVariant | undefined,
): { ok: true; item: PricedItem } | { ok: false; error: PriceError } {
  if (!product || product.status !== "active") {
    return { ok: false, error: { code: "unknown_product", productId: req.productId } };
  }
  const qty = Math.trunc(req.qty);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: { code: "bad_qty", productId: req.productId } };
  }

  let unitCents = product.priceCents;
  let name = product.name;
  let inventory = product.inventory;

  if (req.variantId) {
    if (!variant || variant.productId !== product.id) {
      return {
        ok: false,
        error: { code: "unknown_variant", productId: req.productId, variantId: req.variantId },
      };
    }
    unitCents = variant.priceCents;
    name = `${product.name} — ${variant.label}`;
    inventory = variant.inventory;
  }

  // Server-side stock guard: only enforced when inventory is tracked and
  // backorder is off. The webhook does the real decrement on payment.
  if (product.trackInventory && !product.allowBackorder && qty > inventory) {
    return {
      ok: false,
      error: { code: "insufficient_stock", productId: req.productId, available: inventory },
    };
  }

  return {
    ok: true,
    item: { productId: product.id, variantId: req.variantId ?? null, name, qty, unitCents },
  };
}

/** Sum of priced line items in cents. */
export function itemsSubtotalCents(items: PricedItem[]): number {
  return items.reduce((sum, i) => sum + i.unitCents * i.qty, 0);
}

/**
 * Shipping cost for a chosen zone. Flat charges rateCents; weight charges
 * perLbCents × total weight (lb). A freeOverCents threshold on the subtotal
 * waives shipping entirely. No zone (or unknown) → 0.
 */
export function computeShippingCents(
  zone: StorefrontZone | undefined,
  subtotalCents: number,
  totalWeightLb: number,
): number {
  if (!zone) return 0;
  if (zone.freeOverCents != null && subtotalCents >= zone.freeOverCents) return 0;
  if (zone.method === "weight") {
    return Math.round(zone.perLbCents * Math.max(0, totalWeightLb));
  }
  return zone.rateCents;
}
