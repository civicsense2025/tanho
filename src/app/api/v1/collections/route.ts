import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listCollectionsWithCounts } from "@/modules/commerce/queries";
import { collections } from "@/modules/commerce/schema";
import { collectionSchema } from "@/modules/commerce/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

const invalidate = () => {
  revalidateTag("products", "max");
  revalidateTag("storefront", "max");
};

/**
 * GET /api/v1/collections — list collections with product counts. Editor+.
 * POST /api/v1/collections — create a collection. Body: collectionSchema. Editor+.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listCollectionsWithCounts());
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = collectionSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid collection", 400);
    }
    const dupe = await db.query.collections.findFirst({ where: eq(collections.slug, parsed.data.slug) });
    if (dupe) return fail(`Slug ${parsed.data.slug} is already in use`, 409);
    const [row] = await db
      .insert(collections)
      .values(parsed.data)
      .returning({ id: collections.id });
    await writeAudit({ userId: user.id, action: "collection.create", ownerType: "collection", ownerId: row.id });
    invalidate();
    return ok({ id: row.id }, 201);
  });
}
