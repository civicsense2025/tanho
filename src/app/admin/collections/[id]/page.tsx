import { getAdminSession } from "@/lib/auth";
import { getCollectionById } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { CollectionForm } from "@/components/CollectionForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditCollectionPage({ params }: Props) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const collection = await getCollectionById(id);
  if (!collection) notFound();
  return (
    <AdminPageShell title={collection.name}>
      <CollectionForm collectionId={collection.id} initial={collection} />
    </AdminPageShell>
  );
}
