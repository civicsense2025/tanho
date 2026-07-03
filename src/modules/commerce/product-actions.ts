"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { productCollections, productVariants, products } from "./schema";
import { productSchema, variantSchema } from "./validation";
import { syncProductToStripe } from "./sync";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidate = () => {
  updateTag("products");
  updateTag("storefront");
};

/** Create a product (editor OK). Syncs to Stripe if it starts active. */
export async function createProduct(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }
  const data = parsed.data;
  const dupe = await db.query.products.findFirst({ where: eq(products.slug, data.slug) });
  if (dupe) return { ok: false, error: `Slug ${data.slug} is already in use` };

  const [row] = await db
    .insert(products)
    .values({ ...data, updatedAt: Date.now() })
    .returning();
  if (row.status === "active" || row.priceCents > 0) {
    await syncProductToStripe(row);
  }
  await writeAudit({
    userId: user.id,
    action: "product.create",
    ownerType: "product",
    ownerId: row.id,
  });
  invalidate();
  return { ok: true, data: { id: row.id } };
}

/** Update a product (editor OK). Re-syncs Stripe on activation or price change. */
export async function updateProduct(id: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!existing) return { ok: false, error: "Product not found" };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }
  const data = parsed.data;
  if (data.slug !== existing.slug) {
    const dupe = await db.query.products.findFirst({ where: eq(products.slug, data.slug) });
    if (dupe) return { ok: false, error: `Slug ${data.slug} is already in use` };
  }

  await db.update(products).set({ ...data, updatedAt: Date.now() }).where(eq(products.id, id));

  const becameActive = data.status === "active" && existing.status !== "active";
  const priceChanged = data.priceCents !== existing.priceCents;
  if (becameActive || priceChanged) {
    const fresh = await db.query.products.findFirst({ where: eq(products.id, id) });
    if (fresh) await syncProductToStripe(fresh);
  }
  await writeAudit({
    userId: user.id,
    action: "product.update",
    ownerType: "product",
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}

/** Delete a product + its variants and collection links (owner-only). */
export async function deleteProduct(id: string): Promise<Result> {
  const user = await requireUser("owner");
  await db.delete(productVariants).where(eq(productVariants.productId, id));
  await db.delete(productCollections).where(eq(productCollections.productId, id));
  await db.delete(products).where(eq(products.id, id));
  await writeAudit({
    userId: user.id,
    action: "product.delete",
    ownerType: "product",
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}

/** Add a variant to a product (editor OK). */
export async function addVariant(productId: string, input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product) return { ok: false, error: "Product not found" };
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid variant" };
  }
  const { id, ...data } = parsed.data;
  void id; // variant id is assigned by the DB, not the client
  const [row] = await db
    .insert(productVariants)
    .values({ ...data, productId })
    .returning({ id: productVariants.id });
  await writeAudit({
    userId: user.id,
    action: "product.variant.add",
    ownerType: "product",
    ownerId: productId,
    meta: { variantId: row.id },
  });
  invalidate();
  return { ok: true, data: { id: row.id } };
}

/** Update a variant (editor OK). */
export async function updateVariant(variantId: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.productVariants.findFirst({
    where: eq(productVariants.id, variantId),
  });
  if (!existing) return { ok: false, error: "Variant not found" };
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid variant" };
  }
  const { id, ...data } = parsed.data;
  void id; // never overwrite the primary key from client input
  await db.update(productVariants).set(data).where(eq(productVariants.id, variantId));
  await writeAudit({
    userId: user.id,
    action: "product.variant.update",
    ownerType: "product",
    ownerId: existing.productId,
    meta: { variantId },
  });
  invalidate();
  return { ok: true };
}

/** Remove a variant (editor OK). */
export async function removeVariant(variantId: string): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.productVariants.findFirst({
    where: eq(productVariants.id, variantId),
  });
  if (!existing) return { ok: true };
  await db.delete(productVariants).where(eq(productVariants.id, variantId));
  await writeAudit({
    userId: user.id,
    action: "product.variant.remove",
    ownerType: "product",
    ownerId: existing.productId,
    meta: { variantId },
  });
  invalidate();
  return { ok: true };
}

/** Replace a product's collection membership set (editor OK). */
export async function setProductCollections(
  productId: string,
  collectionIds: string[],
): Promise<Result> {
  const user = await requireUser();
  const clean = [...new Set(collectionIds.filter((c) => typeof c === "string" && c))].slice(0, 100);
  await db.delete(productCollections).where(eq(productCollections.productId, productId));
  if (clean.length > 0) {
    await db
      .insert(productCollections)
      .values(clean.map((collectionId) => ({ productId, collectionId })))
      .onConflictDoNothing();
  }
  await writeAudit({
    userId: user.id,
    action: "product.collections.set",
    ownerType: "product",
    ownerId: productId,
    meta: { count: clean.length },
  });
  invalidate();
  return { ok: true };
}
