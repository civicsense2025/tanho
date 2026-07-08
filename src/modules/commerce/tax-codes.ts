/**
 * Stripe Tax code defaults per product kind.
 *
 * Stripe Tax uses product tax codes (PTCs) to apply the correct rate per
 * jurisdiction. The platform auto-assigns a sensible default from `kind` on
 * product create; creators can override per-product in the editor.
 *
 * Codes verified against https://docs.stripe.com/tax/tax-codes and
 * https://docs.stripe.com/tax/digital-products (Nov 2025).
 *
 * IMPORTANT: courses are NOT "downloadable software" (txcd_10202000 was the
 * naive first guess). Stripe has dedicated course codes:
 *  - txcd_20060158 — On-demand online courses (streamed)
 *  - txcd_20060258 — On-demand online courses (streamed + downloadable)
 *  - txcd_20060052 — Educational services (live instruction)
 * The default below assumes streamed pre-recorded, the most common creator
 * shape; live cohort courses should switch to txcd_20060052.
 */
import type { ProductKind } from "./schema";

export const DEFAULT_TAX_CODE_BY_KIND: Record<ProductKind, string> = {
  physical: "txcd_99999999", // General — tangible goods
  digital: "txcd_10103000", // SaaS — personal use (covers downloads/memberships)
  service: "txcd_20030000", // General — services
  course: "txcd_20060158", // On-demand online courses — streamed
};

/** Course-specific tax codes (exposed so the product form can offer a sub-toggle). */
export const COURSE_TAX_CODES = {
  streamed: "txcd_20060158",
  streamedAndDownloadable: "txcd_20060258",
  liveEducationalService: "txcd_20060052",
} as const;

/** Shipping tax code (Stripe's dedicated shipping line-item code). */
export const SHIPPING_TAX_CODE = "txcd_92010001";

/** Resolve a tax code for a product, falling back to the kind default. */
export function resolveTaxCode(kind: ProductKind, explicit?: string | null): string {
  return explicit && explicit.trim() ? explicit.trim() : DEFAULT_TAX_CODE_BY_KIND[kind];
}
