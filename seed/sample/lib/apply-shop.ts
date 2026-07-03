import { eq } from "drizzle-orm";
import {
  collections,
  productCollections,
  products,
  productVariants,
} from "../../../src/modules/commerce/schema";
import { log, type SeedDb } from "../../lib";
import type { SampleCollection, SampleProduct } from "./types";

/**
 * Seed sample shop content — collections + products + variants — but leave the
 * `ecommerce` settings namespace LOCKED (unlocked=false, the default). The
 * storefront + admin then render their "enable the store" gated state while the
 * data sits ready, so a deployer can explore the locked path and flip it on.
 * Idempotent by slug.
 */
export async function applyShop(
  db: SeedDb,
  shop: { collections: SampleCollection[]; products: SampleProduct[] },
): Promise<void> {
  const collectionIds = new Map<string, string>();
  for (const c of shop.collections) {
    const existing = await db.query.collections.findFirst({
      where: eq(collections.slug, c.slug),
    });
    if (existing) {
      await db
        .update(collections)
        .set({ name: c.name, description: c.description, visible: c.visible })
        .where(eq(collections.id, existing.id));
      collectionIds.set(c.slug, existing.id);
    } else {
      const [row] = await db
        .insert(collections)
        .values({ slug: c.slug, name: c.name, description: c.description, visible: c.visible })
        .returning({ id: collections.id });
      collectionIds.set(c.slug, row!.id);
    }
  }

  for (const p of shop.products) {
    const existing = await db.query.products.findFirst({ where: eq(products.slug, p.slug) });
    const row = {
      slug: p.slug,
      name: p.name,
      status: "active" as const,
      priceCents: p.priceCents,
      compareAtCents: p.compareAtCents ?? null,
      currency: "usd" as const,
      sku: p.sku,
      description: p.description,
      images: [] as string[],
      trackInventory: true,
      inventory: p.inventory,
      lowStockThreshold: p.lowStockThreshold,
      shippingClass: "standard" as const,
      updatedAt: Date.now(),
    };
    let productId: string;
    if (existing) {
      await db.update(products).set(row).where(eq(products.id, existing.id));
      productId = existing.id;
      await db.delete(productVariants).where(eq(productVariants.productId, productId));
      await db.delete(productCollections).where(eq(productCollections.productId, productId));
    } else {
      const [ins] = await db.insert(products).values(row).returning({ id: products.id });
      productId = ins!.id;
    }

    for (const v of p.variants ?? []) {
      await db.insert(productVariants).values({
        productId,
        label: v.label,
        priceCents: v.priceCents,
        inventory: v.inventory,
        sku: v.sku,
      });
    }
    for (const slug of p.collections) {
      const collectionId = collectionIds.get(slug);
      if (collectionId) {
        await db
          .insert(productCollections)
          .values({ productId, collectionId })
          .onConflictDoNothing();
      }
    }
  }

  log(`sample shop seeded (${shop.products.length} products, store left locked)`);
}
