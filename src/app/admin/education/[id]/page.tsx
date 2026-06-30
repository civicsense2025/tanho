import { getAdminSession } from "@/lib/auth";
import { getEducationById } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { EducationForm } from "@/components/EducationForm";

export const dynamic = "force-dynamic";

export default async function EditEducationPage({ params }: { params: Promise<{ id: string }> }) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const education = await getEducationById(Number(id));
  if (!education) redirect("/admin");

  return (
    <AdminPageShell title="Edit school">
      <EducationForm
        educationId={education.id}
        initial={{
          school: education.school,
          degree: education.degree || "",
          span: education.span || "",
          sort_order: education.sort_order,
        }}
      />
    </AdminPageShell>
  );
}
