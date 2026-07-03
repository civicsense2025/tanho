import { describe, expect, it } from "vitest";
import {
  computeShippingCents,
  itemsSubtotalCents,
  priceLineItem,
  type CheckoutRequestItem,
} from "./checkout-pricing";
import type { StorefrontProduct, StorefrontVariant, StorefrontZone } from "./storefront-queries";

const product = (over: Partial<StorefrontProduct> = {}): StorefrontProduct =>
  ({
    id: "prod_1",
    slug: "widget",
    name: "Widget",
    status: "active",
    priceCents: 2500,
    compareAtCents: null,
    currency: "usd",
    sku: "W-1",
    description: "",
    images: [],
    trackInventory: true,
    inventory: 5,
    lowStockThreshold: 10,
    allowBackorder: false,
    weight: "1",
    weightUnit: "lb",
    dims: null,
    shippingClass: "standard",
    seo: null,
    stripeProductId: null,
    stripePriceId: null,
    updatedAt: 0,
    ...over,
  }) as StorefrontProduct;

const variant = (over: Partial<StorefrontVariant> = {}): StorefrontVariant =>
  ({
    id: "var_1",
    productId: "prod_1",
    label: "Large",
    priceCents: 3000,
    inventory: 3,
    sku: "W-1-L",
    weight: "1",
    dims: "",
    imageMediaId: null,
    stripePriceId: null,
    ...over,
  }) as StorefrontVariant;

describe("priceLineItem — price integrity", () => {
  it("uses the DB unit price and IGNORES any client-sent amount", () => {
    // A malicious client could try to smuggle a price; the helper never reads
    // one — it only takes {productId, variantId, qty}.
    const req = { productId: "prod_1", qty: 2, unitCents: 1 } as unknown as CheckoutRequestItem;
    const result = priceLineItem(req, product({ priceCents: 2500 }), undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.unitCents).toBe(2500); // DB price, not the bogus 1
      expect(result.item.qty).toBe(2);
    }
  });

  it("uses the variant's DB price when a variant is selected", () => {
    const result = priceLineItem(
      { productId: "prod_1", variantId: "var_1", qty: 1 },
      product(),
      variant({ priceCents: 3000 }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.item.unitCents).toBe(3000);
  });

  it("rejects an unknown or inactive product", () => {
    expect(priceLineItem({ productId: "x", qty: 1 }, undefined, undefined).ok).toBe(false);
    const draft = product({ status: "draft" });
    expect(priceLineItem({ productId: "prod_1", qty: 1 }, draft, undefined).ok).toBe(false);
  });

  it("rejects qty <= 0", () => {
    expect(priceLineItem({ productId: "prod_1", qty: 0 }, product(), undefined).ok).toBe(false);
    expect(priceLineItem({ productId: "prod_1", qty: -3 }, product(), undefined).ok).toBe(false);
  });

  it("rejects qty over inventory when tracked and backorder off", () => {
    const result = priceLineItem({ productId: "prod_1", qty: 99 }, product({ inventory: 5 }), undefined);
    expect(result.ok).toBe(false);
  });

  it("allows over-inventory qty when backorder is on", () => {
    const result = priceLineItem(
      { productId: "prod_1", qty: 99 },
      product({ inventory: 0, allowBackorder: true }),
      undefined,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a variant that doesn't belong to the product", () => {
    const result = priceLineItem(
      { productId: "prod_1", variantId: "var_9", qty: 1 },
      product(),
      variant({ id: "var_9", productId: "other" }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("itemsSubtotalCents", () => {
  it("sums unit price times quantity", () => {
    expect(
      itemsSubtotalCents([
        { productId: "a", variantId: null, name: "A", qty: 2, unitCents: 2500 },
        { productId: "b", variantId: null, name: "B", qty: 1, unitCents: 1000 },
      ]),
    ).toBe(6000);
  });
});

describe("computeShippingCents", () => {
  const flat = (over: Partial<StorefrontZone> = {}): StorefrontZone =>
    ({
      id: "z1",
      name: "US",
      method: "flat",
      rateCents: 500,
      perLbCents: 0,
      freeOverCents: null,
      countries: [],
      ...over,
    }) as StorefrontZone;

  it("charges the flat rate", () => {
    expect(computeShippingCents(flat(), 3000, 0)).toBe(500);
  });

  it("waives shipping over the freeOver threshold", () => {
    expect(computeShippingCents(flat({ freeOverCents: 5000 }), 6000, 0)).toBe(0);
  });

  it("charges perLb for weight zones", () => {
    expect(
      computeShippingCents(flat({ method: "weight", perLbCents: 200 }), 3000, 2.5),
    ).toBe(500);
  });

  it("returns 0 with no zone", () => {
    expect(computeShippingCents(undefined, 3000, 5)).toBe(0);
  });
});
