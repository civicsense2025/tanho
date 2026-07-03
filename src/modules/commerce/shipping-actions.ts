"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { shippingZones } from "./schema";
import { shippingZoneSchema } from "./validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidate = () => {
  updateTag("shipping");
  updateTag("storefront");
};

/** Create a shipping zone (owner-only). */
export async function createShippingZone(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser("owner");
  const parsed = shippingZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid zone" };
  }
  const [row] = await db
    .insert(shippingZones)
    .values(parsed.data)
    .returning({ id: shippingZones.id });
  await writeAudit({
    userId: user.id,
    action: "shipping.zone.create",
    ownerType: "shipping_zone",
    ownerId: row.id,
  });
  invalidate();
  return { ok: true, data: { id: row.id } };
}

/** Update a shipping zone (owner-only). */
export async function updateShippingZone(id: string, input: unknown): Promise<Result> {
  const user = await requireUser("owner");
  const existing = await db.query.shippingZones.findFirst({ where: eq(shippingZones.id, id) });
  if (!existing) return { ok: false, error: "Zone not found" };
  const parsed = shippingZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid zone" };
  }
  await db.update(shippingZones).set(parsed.data).where(eq(shippingZones.id, id));
  await writeAudit({
    userId: user.id,
    action: "shipping.zone.update",
    ownerType: "shipping_zone",
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}

/** Delete a shipping zone (owner-only). */
export async function deleteShippingZone(id: string): Promise<Result> {
  const user = await requireUser("owner");
  await db.delete(shippingZones).where(eq(shippingZones.id, id));
  await writeAudit({
    userId: user.id,
    action: "shipping.zone.delete",
    ownerType: "shipping_zone",
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}
