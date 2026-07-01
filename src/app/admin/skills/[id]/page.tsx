import { getAdminSession } from "@/lib/auth";
import { getSkillById } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { SkillForm } from "@/components/SkillForm";

export const dynamic = "force-dynamic";

export default async function EditSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const skill = await getSkillById(id);
  if (!skill) redirect("/admin");

  return (
    <AdminPageShell title="Edit skill">
      <SkillForm
        skillId={skill.id}
        initial={{ name: skill.name, category: skill.category || "", sortOrder: skill.sortOrder }}
      />
    </AdminPageShell>
  );
}
