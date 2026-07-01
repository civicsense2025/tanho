import { getAdminSession } from "@/lib/auth";
import { listPlatforms } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ResourceForm } from "@/components/ResourceForm";

export const dynamic = "force-dynamic";

export default async function NewResourcePage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const platforms = await listPlatforms();

  return (
    <AdminPageShell title="New resource">
      <ResourceForm platforms={platforms} />
    </AdminPageShell>
  );
}
