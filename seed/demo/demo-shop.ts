import { eq, and } from "drizzle-orm";
import {
  collections,
  productCollections,
  products,
  productVariants,
  shippingZones,
} from "../../src/modules/commerce/schema";
import { log, type SeedDb } from "../lib";

/**
 * Demo shop — 3 riso-print products with variants, 3 collections (prints /
 * editions / archive), their memberships, and 2 shipping zones. Reproduces
 * shop-data.js. Prices are integer CENTS ($45 → 4500).
 *
 * NOTE: the design's pinned product blocks (product-gallery/buybox/meta) are
 * not registered in this build, so products render from their relational
 * fields + images. No block_set is seeded for products (graceful adaptation).
 */

type ProductSeed = {
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents?: number | null;
  sku: string;
  description: string;
  inventory: number;
  lowStockThreshold: number;
  collections: string[]; // collection slugs
  variants: Array<{ label: string; priceCents: number; inventory: number; sku: string }>;
};

const COLLECTIONS = [
  { slug: "prints", name: "Prints", description: "Open-edition riso prints, restocked when they sell out.", visible: true },
  { slug: "editions", name: "Editions", description: "Numbered, limited runs. When they're gone, they're gone.", visible: true },
  { slug: "archive", name: "Archive", description: "Past work, kept around for the curious.", visible: false },
];

const PRODUCTS: ProductSeed[] = [
  {
    slug: "riso-dawn",
    name: "Dawn — riso print",
    priceCents: 4500,
    compareAtCents: null,
    sku: "RISO-DAWN",
    description:
      "A two-color risograph print in fluorescent orange and blue. Printed by hand on heavyweight uncoated stock. Ships flat.",
    inventory: 24,
    lowStockThreshold: 5,
    collections: ["prints"],
    variants: [
      { label: "A4", priceCents: 4500, inventory: 16, sku: "RISO-DAWN-A4" },
      { label: "A3", priceCents: 6500, inventory: 8, sku: "RISO-DAWN-A3" },
    ],
  },
  {
    slug: "riso-tide",
    name: "Tide — riso print",
    priceCents: 4500,
    compareAtCents: 5500,
    sku: "RISO-TIDE",
    description:
      "A three-color risograph study of moving water. Fluorescent pink, teal, and black on natural stock. Open edition.",
    inventory: 3,
    lowStockThreshold: 5,
    collections: ["prints"],
    variants: [
      { label: "A4", priceCents: 4500, inventory: 2, sku: "RISO-TIDE-A4" },
      { label: "A3", priceCents: 6500, inventory: 1, sku: "RISO-TIDE-A3" },
    ],
  },
  {
    slug: "poster-set",
    name: "Field Notes poster set",
    priceCents: 12000,
    compareAtCents: 15000,
    sku: "POSTER-SET",
    description:
      "A numbered set of three posters from the Field Notes series. Limited run of 50, each signed and stamped. Ships in a tube.",
    inventory: 12,
    lowStockThreshold: 3,
    collections: ["editions", "archive"],
    variants: [{ label: "Set of 3", priceCents: 12000, inventory: 12, sku: "POSTER-SET-3" }],
  },
];

/** Upsert a collection by slug; returns its id. */
async function upsertCollection(db: SeedDb, c: (typeof COLLECTIONS)[number]): Promise<string> {
  const existing = await db.query.collections.findFirst({ where: eq(collections.slug, c.slug) });
  if (existing) {
    await db.update(collections).set({ name: c.name, description: c.description, visible: c.visible }).where(eq(collections.id, existing.id));
    return existing.id;
  }
  const [row] = await db
    .insert(collections)
    .values({ slug: c.slug, name: c.name, description: c.description, visible: c.visible })
    .returning({ id: collections.id });
  return row.id;
}

export async function seedDemoShop(db: SeedDb): Promise<void> {
  const collectionIds = new Map<string, string>();
  for (const c of COLLECTIONS) collectionIds.set(c.slug, await upsertCollection(db, c));

  for (const p of PRODUCTS) {
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
      // Replace variants + collection links for a clean idempotent state.
      await db.delete(productVariants).where(eq(productVariants.productId, productId));
      await db.delete(productCollections).where(eq(productCollections.productId, productId));
    } else {
      const [ins] = await db.insert(products).values(row).returning({ id: products.id });
      productId = ins.id;
    }

    for (const v of p.variants) {
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

  // Shipping zones (idempotent by name).
  const zones = [
    { name: "Canada", method: "flat" as const, rateCents: 800, freeOverCents: 12000, countries: ["CA"] },
    { name: "United States", method: "flat" as const, rateCents: 1200, freeOverCents: 15000, countries: ["US"] },
  ];
  for (const z of zones) {
    const existing = await db.query.shippingZones.findFirst({
      where: and(eq(shippingZones.name, z.name)),
    });
    if (!existing) await db.insert(shippingZones).values(z);
  }

  log(`demo shop seeded: ${PRODUCTS.length} products, ${COLLECTIONS.length} collections, ${zones.length} shipping zones`);
}
