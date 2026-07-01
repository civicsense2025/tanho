import { getAdminSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { PostForm } from "@/components/PostForm";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const settings = await getSettings();
  if (!settings.features.newsletter) notFound();
  if (!(await getAdminSession())) redirect("/admin/login");

  return (
    <AdminPageShell title="New post">
      <PostForm />
    </AdminPageShell>
  );
}
