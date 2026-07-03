import type { StorefrontProduct } from "../storefront-queries";

export type StockLine = { text: string; low: boolean } | null;

/**
 * The storefront stock line for a product, from inventory (the single source
 * of truth). Untracked products show nothing. "Only N left" appears at or
 * below the low-stock threshold. Pure — reused by the grid card and detail.
 */
export function stockLine(p: {
  trackInventory: StorefrontProduct["trackInventory"];
  inventory: number;
  allowBackorder: StorefrontProduct["allowBackorder"];
  lowStockThreshold: number;
}): StockLine {
  if (!p.trackInventory) return null;
  if (p.inventory <= 0) {
    return p.allowBackorder
      ? { text: "Backorder", low: false }
      : { text: "Out of stock", low: true };
  }
  if (p.inventory <= p.lowStockThreshold) {
    return { text: `Only ${p.inventory} left`, low: true };
  }
  return null;
}
