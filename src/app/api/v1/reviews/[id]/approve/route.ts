import { eq } from "drizzle-orm";
import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail } from "@/lib/api/v1";
import { reviews } from "@/modules/reviews/schema";
import { getReview, recomputeAggregate } from "@/modules/reviews/queries";

/**
 * POST /api/v1/reviews/:id/approve — set status to "approved" and recompute the
 * target's aggregate.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const review = await getReview(id);
    if (!review) return fail("Review not found", 404);

    await db
      .update(reviews)
      .set({ status: "approved", updatedAt: Date.now() })
      .where(eq(reviews.id, id));

    await recomputeAggregate(review.targetType, review.targetId);
    revalidateTag("reviews", "max");
    await writeAudit({
      userId: user.id,
      action: "review.approve",
      ownerType: "review",
      ownerId: id,
    });
    return ok();
  });
}
