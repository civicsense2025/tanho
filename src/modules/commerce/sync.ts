import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payments } from "@/adapters/payments";
import { products } from "./schema";
import type { ProductRow } from "./queries";

/** Strip HTML tags from a product description before sending it to Stripe. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * Upsert a product's durable Stripe product + price and persist the returned
 * ids. A no-op when payments are unconfigured (the null adapter) so product
 * edits never fail just because Stripe isn't connected. Prices are the
 * DB's integer cents — authoritative, never client-supplied.
 */
export async function syncProductToStripe(product: ProductRow): Promise<void> {
  if (!payments.isConfigured()) return;
  const { productId, priceId } = await payments.syncProduct({
    name: product.name,
    description: stripHtml(product.description),
    priceCents: product.priceCents,
    currency: product.currency,
    existingProductId: product.stripeProductId ?? undefined,
  });
  await db
    .update(products)
    .set({ stripeProductId: productId, stripePriceId: priceId })
    .where(eq(products.id, product.id));
}
