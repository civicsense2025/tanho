import { Suspense } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/modules/auth/guards";
import { AdminPage } from "@/components/admin/AdminPage";
import { db } from "@/lib/db/client";
import { people } from "@/modules/people/schema";
import { getReview, getOwnerReply } from "@/modules/reviews/queries";
import {
  ReviewDetailScreen,
  type ReviewerSummary,
} from "@/modules/reviews/admin/ReviewDetailScreen";

export const metadata = { title: "Review" };

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ReviewPageInner params={params} />
    </Suspense>
  );
}

async function ReviewPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const review = await getReview(id);
  if (!review) notFound();

  const [reviewerRow, replyRow] = await Promise.all([
    db.query.people.findFirst({ where: eq(people.id, review.personId) }),
    getOwnerReply(id),
  ]);

  const reviewer: ReviewerSummary | null = reviewerRow
    ? { id: reviewerRow.id, name: reviewerRow.name, email: reviewerRow.email }
    : null;

  const reply = replyRow ? { body: replyRow.body, at: replyRow.at } : null;

  return (
    <AdminPage width="wide">
      <ReviewDetailScreen review={review} reviewer={reviewer} reply={reply} />
    </AdminPage>
  );
}
