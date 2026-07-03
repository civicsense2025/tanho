import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listShippingZones } from "@/modules/commerce/queries";
import { shippingZones } from "@/modules/commerce/schema";
import { shippingZoneSchema } from "@/modules/commerce/validation";
import { db } from "@/lib/db/client";
import { updateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

const invalidate = () => {
  updateTag("shipping");
  updateTag("storefront");
};

/**
 * GET /api/v1/shipping-zones — list all shipping zones. Editor+.
 * POST /api/v1/shipping-zones — create. Body: shippingZoneSchema. Owner-only.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listShippingZones());
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = shippingZoneSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid shipping zone", 400);
    }
    const [row] = await db
      .insert(shippingZones)
      .values(parsed.data)
      .returning({ id: shippingZones.id });
    await writeAudit({ userId: user.id, action: "shipping.zone.create", ownerType: "shipping_zone", ownerId: row.id });
    invalidate();
    return ok({ id: row.id }, 201);
  });
}
