import { eq } from "drizzle-orm";
import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";
import { reviewReplies } from "@/modules/reviews/schema";
import { reviewReplySchema } from "@/modules/reviews/validation";
import { getReview } from "@/modules/reviews/queries";

/**
 * POST /api/v1/reviews/:id/reply — upsert an owner reply (one per review).
 *   Body: reviewReplySchema { body }. findFirst then insert-or-update (no unique
 *   constraint on reviewId alone to upsert against).
 * DELETE /api/v1/reviews/:id/reply — delete the owner reply on a review.
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
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = reviewReplySchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid reply", 400);
    }

    const existing = await db.query.reviewReplies.findFirst({
      where: eq(reviewReplies.reviewId, id),
    });
    if (existing) {
      await db
        .update(reviewReplies)
        .set({ body: parsed.data.body, byUserId: user.id, updatedAt: Date.now() })
        .where(eq(reviewReplies.reviewId, id));
    } else {
      await db.insert(reviewReplies).values({
        reviewId: id,
        body: parsed.data.body,
        byUserId: user.id,
      });
    }

    revalidateTag("reviews", "max");
    await writeAudit({
      userId: user.id,
      action: "review.reply",
      ownerType: "review",
      ownerId: id,
    });
    return ok();
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const review = await getReview(id);
    if (!review) return fail("Review not found", 404);

    await db.delete(reviewReplies).where(eq(reviewReplies.reviewId, id));

    revalidateTag("reviews", "max");
    await writeAudit({
      userId: user.id,
      action: "review.reply.delete",
      ownerType: "review",
      ownerId: id,
    });
    return ok();
  });
}
