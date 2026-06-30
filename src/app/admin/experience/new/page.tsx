import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ExperienceForm } from "@/components/ExperienceForm";

export const dynamic = "force-dynamic";

export default async function NewExperiencePage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");

  return (
    <AdminPageShell title="New experience">
      <ExperienceForm />
    </AdminPageShell>
  );
}
