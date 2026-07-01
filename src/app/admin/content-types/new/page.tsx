import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ContentTypeForm } from "@/components/ContentTypeForm";

export const dynamic = "force-dynamic";

export default async function NewContentTypePage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  return (
    <AdminPageShell title="New content type">
      <ContentTypeForm />
    </AdminPageShell>
  );
}
