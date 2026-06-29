import { getAdminSession } from "@/lib/auth";
import { getProjectById, getBlocks } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
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
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <Link href="/admin" className="text-xs text-[#444] hover:text-[#666] transition-colors">← Projects</Link>
        <h1 className="text-lg font-medium mt-4">{project.title}</h1>
      </div>
      <ProjectForm
        projectId={project.id}
        initial={{
          title: project.title, slug: project.slug,
          tagline: project.tagline || "", description: project.description || "",
          cover_image: project.cover_image || "", tags: parseTags(project.tags),
          github_url: project.github_url || "", live_url: project.live_url || "",
          year: project.year || new Date().getFullYear(),
          status: project.status, sort_order: project.sort_order,
        }}
        initialBlocks={blocks}
      />
    </div>
  );
}
