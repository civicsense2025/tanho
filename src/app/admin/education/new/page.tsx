import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { EducationForm } from "@/components/EducationForm";

export const dynamic = "force-dynamic";

export default async function NewEducationPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");

  return (
    <AdminPageShell title="New school">
      <EducationForm />
    </AdminPageShell>
  );
}
