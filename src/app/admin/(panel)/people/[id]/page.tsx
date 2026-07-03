import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { getPerson } from "@/modules/people/queries";
import { PersonProfile } from "@/modules/people/admin/PersonProfile";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Person" };

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getPerson(id);
  if (!data) notFound();
  return (
    <AdminPage width="wide">
      <PersonProfile data={data} isOwner={user.role === "owner"} />
    </AdminPage>
  );
}
