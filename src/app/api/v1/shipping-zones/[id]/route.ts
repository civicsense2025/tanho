import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { shippingZones } from "@/modules/commerce/schema";
import { shippingZoneSchema } from "@/modules/commerce/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

const invalidate = () => {
  updateTag("shipping");
  updateTag("storefront");
};

/**
 * PATCH /api/v1/shipping-zones/:id — update (partial). Owner-only.
 * DELETE /api/v1/shipping-zones/:id — delete. Owner-only.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    const existing = await db.query.shippingZones.findFirst({ where: eq(shippingZones.id, id) });
    if (!existing) return fail("Shipping zone not found", 404);
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = shippingZoneSchema.partial().safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid shipping zone", 400);
    }
    await db.update(shippingZones).set(parsed.data).where(eq(shippingZones.id, id));
    await writeAudit({ userId: user.id, action: "shipping.zone.update", ownerType: "shipping_zone", ownerId: id });
    invalidate();
    return ok();
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    await db.delete(shippingZones).where(eq(shippingZones.id, id));
    await writeAudit({ userId: user.id, action: "shipping.zone.delete", ownerType: "shipping_zone", ownerId: id });
    invalidate();
    return ok();
  });
}
