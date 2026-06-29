import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getProjectById, updateProject, deleteProject, getBlocks, upsertBlocks } from "@/lib/db";
import { slugify } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const project = await getProjectById(Number(id));
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...project, blocks: await getBlocks(project.id) });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { blocks, ...data } = body;
  if (data.title && !data.slug) data.slug = slugify(data.title);
  if (data.tags) data.tags = JSON.stringify(data.tags);
  const project = await updateProject(Number(id), data);
  if (blocks !== undefined) await upsertBlocks(project.id, blocks);
  return NextResponse.json({ ...project, blocks: await getBlocks(project.id) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteProject(Number(id));
  return NextResponse.json({ ok: true });
}
