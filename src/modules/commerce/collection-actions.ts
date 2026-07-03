"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { collections, productCollections } from "./schema";
import { collectionSchema } from "./validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidate = () => {
  updateTag("products");
  updateTag("storefront");
};

/** Create a collection (editor OK). */
export async function createCollection(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid collection" };
  }
  const data = parsed.data;
  const dupe = await db.query.collections.findFirst({ where: eq(collections.slug, data.slug) });
  if (dupe) return { ok: false, error: `Slug ${data.slug} is already in use` };

  const [row] = await db
    .insert(collections)
    .values(data)
    .returning({ id: collections.id });
  await writeAudit({
    userId: user.id,
    action: "collection.create",
    ownerType: "collection",
    ownerId: row.id,
  });
  invalidate();
  return { ok: true, data: { id: row.id } };
}

/** Update a collection (editor OK). */
export async function updateCollection(id: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.collections.findFirst({ where: eq(collections.id, id) });
  if (!existing) return { ok: false, error: "Collection not found" };
  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid collection" };
  }
  const data = parsed.data;
  if (data.slug !== existing.slug) {
    const dupe = await db.query.collections.findFirst({ where: eq(collections.slug, data.slug) });
    if (dupe) return { ok: false, error: `Slug ${data.slug} is already in use` };
  }
  await db.update(collections).set(data).where(eq(collections.id, id));
  await writeAudit({
    userId: user.id,
    action: "collection.update",
    ownerType: "collection",
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}

/** Delete a collection + its membership links (owner-only). */
export async function deleteCollection(id: string): Promise<Result> {
  const user = await requireUser("owner");
  await db.delete(productCollections).where(eq(productCollections.collectionId, id));
  await db.delete(collections).where(eq(collections.id, id));
  await writeAudit({
    userId: user.id,
    action: "collection.delete",
    ownerType: "collection",
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}

/** Add one product to a collection (editor OK). */
export async function addProductToCollection(
  productId: string,
  collectionId: string,
): Promise<Result> {
  const user = await requireUser();
  await db.insert(productCollections).values({ productId, collectionId }).onConflictDoNothing();
  await writeAudit({
    userId: user.id,
    action: "collection.product.add",
    ownerType: "collection",
    ownerId: collectionId,
    meta: { productId },
  });
  invalidate();
  return { ok: true };
}

/** Remove one product from a collection (editor OK). */
export async function removeProductFromCollection(
  productId: string,
  collectionId: string,
): Promise<Result> {
  const user = await requireUser();
  await db
    .delete(productCollections)
    .where(
      and(
        eq(productCollections.productId, productId),
        eq(productCollections.collectionId, collectionId),
      ),
    );
  await writeAudit({
    userId: user.id,
    action: "collection.product.remove",
    ownerType: "collection",
    ownerId: collectionId,
    meta: { productId },
  });
  invalidate();
  return { ok: true };
}
