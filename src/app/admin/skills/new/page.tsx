import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { SkillForm } from "@/components/SkillForm";

export const dynamic = "force-dynamic";

export default async function NewSkillPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");

  return (
    <AdminPageShell title="New skill">
      <SkillForm />
    </AdminPageShell>
  );
}
