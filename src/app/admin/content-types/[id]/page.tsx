import { getAdminSession } from "@/lib/auth";
import { getContentTypeById } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ContentTypeForm } from "@/components/ContentTypeForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditContentTypePage({ params }: Props) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const type = await getContentTypeById(id);
  if (!type) notFound();
  return (
    <AdminPageShell title={type.name}>
      <ContentTypeForm typeId={type.id} initial={type} />
    </AdminPageShell>
  );
}
