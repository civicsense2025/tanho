import { getAdminSession } from "@/lib/auth";
import { getAwardById } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { AwardForm } from "@/components/AwardForm";

export const dynamic = "force-dynamic";

export default async function EditAwardPage({ params }: { params: Promise<{ id: string }> }) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const award = await getAwardById(Number(id));
  if (!award) redirect("/admin");

  return (
    <AdminPageShell title="Edit award">
      <AwardForm
        awardId={award.id}
        initial={{
          title: award.title,
          organization: award.organization || "",
          description: award.description || "",
          date: award.date || "",
          url: award.url || "",
          sort_order: award.sort_order,
        }}
      />
    </AdminPageShell>
  );
}
