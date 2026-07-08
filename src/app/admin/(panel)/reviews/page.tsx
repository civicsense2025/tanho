import { Suspense } from "react";
import { desc, inArray } from "drizzle-orm";
import { requireUser } from "@/modules/auth/guards";
import { AdminPage } from "@/components/admin/AdminPage";
import { db } from "@/lib/db/client";
import { people } from "@/modules/people/schema";
import { listPendingReviews } from "@/modules/reviews/queries";
import { reviews } from "@/modules/reviews/schema";
import {
  ReviewsModerationScreen,
  type ModerationRow,
} from "@/modules/reviews/admin/ReviewsModerationScreen";

export const metadata = { title: "Reviews" };

/** Join reviewer display names onto a set of raw review rows. */
async function withReviewerNames(
  rows: Awaited<ReturnType<typeof listPendingReviews>>,
): Promise<ModerationRow[]> {
  if (rows.length === 0) return [];
  const personIds = [...new Set(rows.map((r) => r.personId))];
  const peopleRows = await db.query.people.findMany({
    where: inArray(people.id, personIds),
    columns: { id: true, name: true },
  });
  const nameByPerson = new Map(peopleRows.map((p) => [p.id, p.name]));
  return rows.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    personId: r.personId,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    verified: r.verified,
    verifiedMethod: r.verifiedMethod,
    verifiedRef: r.verifiedRef,
    at: r.at,
    reviewerName: nameByPerson.get(r.personId) ?? "Anonymous",
  }));
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={null}>
      <ReviewsPageInner />
    </Suspense>
  );
}

async function ReviewsPageInner() {
  await requireUser();

  const [pendingRows, allRows] = await Promise.all([
    listPendingReviews(),
    db.query.reviews.findMany({ orderBy: [desc(reviews.at)], limit: 200 }),
  ]);

  const [pending, all] = await Promise.all([
    withReviewerNames(pendingRows),
    withReviewerNames(allRows),
  ]);

  return (
    <AdminPage width="wide">
      <ReviewsModerationScreen pending={pending} all={all} />
    </AdminPage>
  );
}
