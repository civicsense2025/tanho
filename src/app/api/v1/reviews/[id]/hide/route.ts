import { eq } from "drizzle-orm";
import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";
import { reviews } from "@/modules/reviews/schema";
import { reviewModerateSchema } from "@/modules/reviews/validation";
import { getReview, recomputeAggregate } from "@/modules/reviews/queries";

/**
 * POST /api/v1/reviews/:id/hide — set status to "hidden" + moderationNote.
 * Body: reviewModerateSchema { note }.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const review = await getReview(id);
    if (!review) return fail("Review not found", 404);

    const body = await parseBody(req);
    const parsed = reviewModerateSchema.safeParse(body ?? {});
    const note = parsed.success ? parsed.data.note : "";

    await db
      .update(reviews)
      .set({ status: "hidden", moderationNote: note, updatedAt: Date.now() })
      .where(eq(reviews.id, id));

    await recomputeAggregate(review.targetType, review.targetId);
    revalidateTag("reviews", "max");
    await writeAudit({
      userId: user.id,
      action: "review.hide",
      ownerType: "review",
      ownerId: id,
      meta: { note },
    });
    return ok();
  });
}
