import { centsToDollars } from "../money";
import type { ProductRow } from "../queries";
import { CURRENCIES } from "../validation";

/** Form-local product state — prices as dollar strings, ints as strings. */
export type FormState = {
  name: string;
  slug: string;
  status: "draft" | "active";
  price: string;
  compareAt: string;
  currency: (typeof CURRENCIES)[number];
  sku: string;
  description: string;
  images: string[];
  trackInventory: boolean;
  inventory: string;
  lowStockThreshold: string;
  allowBackorder: boolean;
  weight: string;
  weightUnit: "lb" | "kg";
  shippingClass: "standard" | "heavy" | "digital";
  seoTitle: string;
  seoDescription: string;
};

export const initState = (p: ProductRow): FormState => ({
  name: p.name,
  slug: p.slug,
  status: p.status,
  price: centsToDollars(p.priceCents),
  compareAt: p.compareAtCents != null ? centsToDollars(p.compareAtCents) : "",
  currency: (CURRENCIES as readonly string[]).includes(p.currency)
    ? (p.currency as FormState["currency"])
    : "usd",
  sku: p.sku,
  description: p.description,
  images: p.images ?? [],
  trackInventory: p.trackInventory,
  inventory: String(p.inventory),
  lowStockThreshold: String(p.lowStockThreshold),
  allowBackorder: p.allowBackorder,
  weight: p.weight,
  weightUnit: p.weightUnit,
  shippingClass: p.shippingClass,
  seoTitle: p.seo?.title ?? "",
  seoDescription: p.seo?.description ?? "",
});

export const intOf = (s: string) => Math.max(0, parseInt(s || "0", 10) || 0);
