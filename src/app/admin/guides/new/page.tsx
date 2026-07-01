import { getAdminSession } from "@/lib/auth";
import { listPlatforms, listTags, listResources } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { GuideForm } from "@/components/GuideForm";

export const dynamic = "force-dynamic";

export default async function NewGuidePage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const [platforms, tags, resources] = await Promise.all([listPlatforms(), listTags(), listResources(false)]);

  return (
    <AdminPageShell title="New guide">
      <GuideForm platforms={platforms} tags={tags} resources={resources} />
    </AdminPageShell>
  );
}
