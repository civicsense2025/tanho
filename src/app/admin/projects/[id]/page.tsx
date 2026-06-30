import { getAdminSession } from "@/lib/auth";
import { getProjectById, getBlocks } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ProjectForm } from "@/components/ProjectForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Props) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const project = await getProjectById(Number(id));
  if (!project) notFound();
  const blocks = await getBlocks(project.id);

  return (
    <AdminPageShell title={project.title}>
      <ProjectForm
        projectId={project.id}
        initial={{
          title: project.title, slug: project.slug,
          tagline: project.tagline || "", description: project.description || "",
          cover_image: project.cover_image || "", logo_url: project.logo_url || "", tags: parseTags(project.tags),
          github_url: project.github_url || "", live_url: project.live_url || "",
          year: project.year || new Date().getFullYear(),
          status: project.status, sort_order: project.sort_order,
        }}
        initialBlocks={blocks}
      />
    </AdminPageShell>
  );
}
