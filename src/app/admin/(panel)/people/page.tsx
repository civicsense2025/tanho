import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { listAllPeople, segmentCounts } from "@/modules/people/queries";
import { PeopleScreen } from "@/modules/people/admin/PeopleScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <Suspense fallback={null}>
      <PeoplePageInner />
    </Suspense>
  );
}

async function PeoplePageInner() {
  await requireUser();
  const [people, counts] = await Promise.all([listAllPeople(), segmentCounts()]);
  return (
    <AdminPage>
      <PeopleScreen people={people} counts={counts} />
    </AdminPage>
  );
}
