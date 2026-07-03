/**
 * Pure money formatting — safe to import from client components. Kept out of
 * storefront-queries.ts so importing a formatter never drags a "use cache"
 * server query into a client bundle.
 */
export function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((cents ?? 0) / 100);
}
