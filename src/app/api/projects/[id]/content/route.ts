import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getProjectById } from "@/lib/db";
import { getProjectBody, saveProjectBody } from "@/lib/content/project-content";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await getProjectBody(project);
  return NextResponse.json({ body });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { body } = await req.json();
  if (typeof body !== "string") return NextResponse.json({ error: "body must be a string" }, { status: 400 });
  await saveProjectBody(project.slug, body);
  return NextResponse.json({ ok: true });
}
