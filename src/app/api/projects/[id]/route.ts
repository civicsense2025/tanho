import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getProjectById, updateProject, deleteProject, getBlocks, upsertBlocks } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { handleSlugRename } from "@/lib/content/project-content";
import { deleteProjectMdx } from "@/lib/content/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...project, blocks: await getBlocks(project.id) });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getProjectById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const { blocks, ...data } = body;
  if (data.title && !data.slug) data.slug = slugify(data.title);
  if (data.tags) data.tags = JSON.stringify(data.tags);

  // Rename the MDX file before touching the DB: if the rename fails, the DB
  // still points at the old (still-valid) slug, so nothing is left orphaned.
  if (typeof data.slug === "string" && data.slug !== existing.slug) {
    try {
      await handleSlugRename(existing.slug, data.slug);
    } catch (err) {
      return NextResponse.json({ error: `Failed to rename content file: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
    }
  }

  const project = await updateProject(id, data);
  if (blocks !== undefined) await upsertBlocks(project.id, blocks);
  return NextResponse.json({ ...project, blocks: await getBlocks(project.id) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await getProjectById(id);
  await deleteProject(id);
  if (project) await deleteProjectMdx(project.slug);
  return NextResponse.json({ ok: true });
}
