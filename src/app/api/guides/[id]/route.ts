import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import {
  getGuideById, updateGuide, deleteGuide, getSteps, upsertSteps,
  getGuideTags, setGuideTags, getResourcesForGuide, setGuideResources,
} from "@/lib/db";
import { slugify } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guide = await getGuideById(Number(id));
  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [steps, tags, resources] = await Promise.all([
    getSteps(guide.id),
    getGuideTags(guide.id),
    getResourcesForGuide(guide.id, false),
  ]);
  return NextResponse.json({ ...guide, steps, tags, resources });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { steps, tagIds, resourceIds, ...data } = body;
  if (data.title && !data.slug) data.slug = slugify(data.title);
  if (data.skills_required) data.skills_required = JSON.stringify(data.skills_required);
  if (data.requirements) data.requirements = JSON.stringify(data.requirements);
  const guide = await updateGuide(Number(id), data);
  if (steps !== undefined) await upsertSteps(guide.id, steps);
  if (tagIds !== undefined) await setGuideTags(guide.id, tagIds);
  if (resourceIds !== undefined) await setGuideResources(guide.id, resourceIds);
  return NextResponse.json({ ...guide, steps: await getSteps(guide.id) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteGuide(Number(id));
  return NextResponse.json({ ok: true });
}
