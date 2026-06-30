import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listProjects, createProject } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  return NextResponse.json(await listProjects(false));
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const project = await createProject({
    slug: body.slug || slugify(body.title),
    title: body.title, tagline: body.tagline || null,
    description: body.description || null, cover_image: body.cover_image || null,
    logo_url: body.logo_url || null,
    tags: JSON.stringify(body.tags || []), github_url: body.github_url || null,
    live_url: body.live_url || null, year: body.year || new Date().getFullYear(),
    status: body.status || "draft", sort_order: body.sort_order || 0,
  });
  return NextResponse.json(project, { status: 201 });
}
