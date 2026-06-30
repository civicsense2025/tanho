import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { AwardForm } from "@/components/AwardForm";

export const dynamic = "force-dynamic";

export default async function NewAwardPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");

  return (
    <AdminPageShell title="New award">
      <AwardForm />
    </AdminPageShell>
  );
}
