import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { CollectionForm } from "@/components/CollectionForm";

export const dynamic = "force-dynamic";

export default async function NewCollectionPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  return (
    <AdminPageShell title="New collection">
      <CollectionForm />
    </AdminPageShell>
  );
}
