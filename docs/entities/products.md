# Products & collections

The store. Products carry price, inventory, variants, photos, and shipping
details; collections group them for the storefront. Everything is priced in
integer cents and inventory is the single source of truth shared by the
admin and the storefront.

## Enabling the store

Commerce is **locked by default**. In **Admin → Shop**, click *Enable
store*; to actually sell, connect Stripe (see
[../recipes/connect-stripe.md](../recipes/connect-stripe.md)). Without
Stripe, products and the storefront still work — checkout shows a "not yet
accepting payments" message.

## Product data

| Field | Notes |
| --- | --- |
| `priceCents`, `compareAtCents` | Integer cents; forms accept dollars |
| `status` | `draft` / `active` — only active products reach the storefront |
| `sku`, `description`, `images` | Description is sanitized rich text; images from the media library |
| `trackInventory`, `inventory`, `lowStockThreshold`, `allowBackorder` | Stock behavior and the "Only N left" / backorder lines |
| `variants` | Per-variant price/inventory/sku |
| `weight`, `dims`, `shippingClass` | Shipping inputs |
| `stripeProductId`, `stripePriceId` | Synced on publish when Stripe is connected |

Publishing a product (or changing its price) syncs a durable Stripe product
and price. Prices are immutable in Stripe, so a price change archives the old
one and points the row at a fresh one.

## Storefront

`/shop` lists active products with a visible-collection filter; `/shop/:slug`
is the product page (gallery, variant picker, add-to-cart). The cart lives in
`localStorage`, but **checkout recomputes every price from the database** —
the client's cart amounts are display-only and never trusted.

## Fit it to your cause

- **Sell services, not goods**: set `shippingClass: digital` and
  `trackInventory: false`.
- **Donations**: a single product with an open/variant price and no
  inventory works as a "pay what you want".
- **Catalog-only (no checkout)**: leave Stripe disconnected — products
  display, checkout is disabled.

## FAQ

**Can a customer tamper with the price?** No. `startCheckout` re-fetches
each product/variant from the DB and computes the total server-side;
`checkout-pricing.test.ts` proves a forged client price is ignored.

**Where does inventory get decremented?** Only in the Stripe webhook
handler, inside a transaction, when the order is confirmed paid — never
optimistically on the client.
