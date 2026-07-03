"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { entries } from "@/modules/entries/schema";
import { products } from "@/modules/commerce/schema";
import type { ProductRow } from "@/modules/commerce/queries";
import { syncProductToStripe } from "@/modules/commerce/sync";
import { CURRENCIES } from "@/modules/commerce/validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidate = () => {
  updateTag("products");
  updateTag("storefront");
  updateTag("pack-entitlements");
};

export type PackProduct = ProductRow & {
  packTitle: string;
  packSlug: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const createInputSchema = z.object({
  packType: z.enum(["block_pack", "design_pack"]),
  packEntryId: z.string().min(1).max(120),
  price: z.number().int().min(0).max(100_000_00),
  currency: z.enum(CURRENCIES).default("usd"),
});

/**
 * Create a commerce product linked to a block_pack or design_pack entry.
 * The product is digital (no inventory tracking, digital shipping class) and
 * starts active so it's immediately buyable. Syncs to Stripe when payments
 * are configured. Owner-only.
 */
export async function createPackProduct(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser("owner");
  const parsed = createInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { packType, packEntryId, price, currency } = parsed.data;

  // Validate the pack entry exists and matches the declared type.
  const entry = await db.query.entries.findFirst({ where: eq(entries.id, packEntryId) });
  if (!entry) return { ok: false, error: "Pack not found" };
  if (entry.type !== packType) {
    return { ok: false, error: `Entry is a ${entry.type}, not a ${packType}` };
  }

  // Prevent duplicate pack products for the same pack.
  const existing = await db.query.products.findFirst({
    where: and(eq(products.packType, packType), eq(products.packEntryId, packEntryId)),
  });
  if (existing) return { ok: false, error: "A product already exists for this pack" };

  const slug = slugify(entry.title);
  const dupe = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (dupe) return { ok: false, error: `Slug ${slug} is already in use by another product` };

  const [row] = await db
    .insert(products)
    .values({
      name: entry.title,
      slug,
      status: "active",
      priceCents: price,
      currency,
      description: (entry.data as { description?: string })?.description ?? "",
      trackInventory: false,
      inventory: 0,
      shippingClass: "digital",
      packType,
      packEntryId,
      updatedAt: Date.now(),
    })
    .returning();

  await syncProductToStripe(row);
  await writeAudit({
    userId: user.id,
    action: "pack_product.create",
    ownerType: "product",
    ownerId: row.id,
    meta: { packType, packEntryId, priceCents: price },
  });
  invalidate();
  return { ok: true, data: { id: row.id } };
}

const priceInputSchema = z.object({
  price: z.number().int().min(0).max(100_000_00),
  currency: z.enum(CURRENCIES).default("usd"),
});

/**
 * Update the price (and currency) of a pack product. Re-syncs Stripe.
 * Owner-only.
 */
export async function updatePackProductPrice(
  productId: string,
  input: unknown,
): Promise<Result> {
  const user = await requireUser("owner");
  const existing = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!existing) return { ok: false, error: "Product not found" };
  if (!existing.packType) return { ok: false, error: "Not a pack product" };

  const parsed = priceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid price" };
  }
  const { price, currency } = parsed.data;

  await db
    .update(products)
    .set({ priceCents: price, currency, updatedAt: Date.now() })
    .where(eq(products.id, productId));

  const fresh = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (fresh) await syncProductToStripe(fresh);

  await writeAudit({
    userId: user.id,
    action: "pack_product.update_price",
    ownerType: "product",
    ownerId: productId,
    meta: { priceCents: price, currency },
  });
  invalidate();
  return { ok: true };
}

/**
 * Remove the pack-product link. The commerce product row is kept (so historical
 * orders stay intact) but it's no longer associated with the pack. Owner-only.
 */
export async function unlinkPackProduct(productId: string): Promise<Result> {
  const user = await requireUser("owner");
  const existing = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!existing) return { ok: false, error: "Product not found" };
  if (!existing.packType) return { ok: false, error: "Not a pack product" };

  await db
    .update(products)
    .set({ packType: null, packEntryId: null, updatedAt: Date.now() })
    .where(eq(products.id, productId));

  await writeAudit({
    userId: user.id,
    action: "pack_product.unlink",
    ownerType: "product",
    ownerId: productId,
    meta: { packType: existing.packType, packEntryId: existing.packEntryId },
  });
  invalidate();
  return { ok: true };
}

/**
 * List all products linked to packs, with the linked pack's title/slug.
 * Used by the admin "Pack products" screen.
 */
export async function listPackProducts(): Promise<PackProduct[]> {
  const rows = await db.query.products.findMany({
    where: isNotNull(products.packType),
    orderBy: [desc(products.updatedAt)],
  });
  if (rows.length === 0) return [];
  const entryIds = [...new Set(rows.map((r) => r.packEntryId).filter((v): v is string => !!v))];
  const entryRows = await db.query.entries.findMany({
    where: inArray(entries.id, entryIds),
  });
  const byId = new Map(entryRows.map((e) => [e.id, e]));
  return rows.map((p) => {
    const entry = byId.get(p.packEntryId ?? "");
    return {
      ...p,
      packTitle: entry?.title ?? "Unknown pack",
      packSlug: entry?.slug ?? "",
    };
  });
}
