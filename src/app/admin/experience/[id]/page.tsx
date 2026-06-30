import { getAdminSession } from "@/lib/auth";
import { getExperienceById } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ExperienceForm } from "@/components/ExperienceForm";

export const dynamic = "force-dynamic";

export default async function EditExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const experience = await getExperienceById(Number(id));
  if (!experience) redirect("/admin");

  return (
    <AdminPageShell title="Edit experience">
      <ExperienceForm
        experienceId={experience.id}
        initial={{
          company: experience.company,
          role: experience.role,
          description: experience.description || "",
          start_date: experience.start_date || "",
          end_date: experience.end_date || "",
          current: experience.current === 1,
          sort_order: experience.sort_order,
        }}
      />
    </AdminPageShell>
  );
}
