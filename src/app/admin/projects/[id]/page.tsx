import { getAdminSession } from "@/lib/auth";
import { getProjectById, getBlocks } from "@/lib/db";
import { getProjectBody } from "@/lib/content/project-content";
import { parseTags } from "@/lib/utils";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ProjectEditorWithPreview } from "@/components/ProjectEditorWithPreview";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Props) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const [blocks, body] = await Promise.all([getBlocks(project.id), getProjectBody(project)]);

  return (
    <AdminPageShell title={project.title} wide>
      <ProjectEditorWithPreview
        projectId={project.id}
        slug={project.slug}
        initial={{
          title: project.title, slug: project.slug,
          tagline: project.tagline || "",
          coverImage: project.coverImage || "", logoUrl: project.logoUrl || "", tags: parseTags(project.tags),
          githubUrl: project.githubUrl || "", liveUrl: project.liveUrl || "",
          year: project.year || new Date().getFullYear(),
          status: project.status, sortOrder: project.sortOrder,
        }}
        initialBlocks={blocks}
        initialBody={body}
      />
    </AdminPageShell>
  );
}
