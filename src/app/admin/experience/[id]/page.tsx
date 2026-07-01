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
  const experience = await getExperienceById(id);
  if (!experience) redirect("/admin");

  return (
    <AdminPageShell title="Edit experience">
      <ExperienceForm
        experienceId={experience.id}
        initial={{
          company: experience.company,
          role: experience.role,
          description: experience.description || "",
          startDate: experience.startDate || "",
          endDate: experience.endDate || "",
          current: experience.current === 1,
          sortOrder: experience.sortOrder,
        }}
      />
    </AdminPageShell>
  );
}
