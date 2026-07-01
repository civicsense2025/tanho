import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import {
  getGuideById, updateGuide, deleteGuide, getGuideSteps, replaceGuideSteps,
  getGuideTags, setGuideTags, getResourcesForGuide, setGuideResources,
} from "@/lib/db";
import { slugify } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guide = await getGuideById(id);
  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [steps, tags, resources] = await Promise.all([
    getGuideSteps(guide.id),
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
  if (data.skillsRequired) data.skillsRequired = JSON.stringify(data.skillsRequired);
  if (data.requirements) data.requirements = JSON.stringify(data.requirements);
  if (data.noIndex !== undefined) data.noIndex = data.noIndex ? 1 : 0;
  const guide = await updateGuide(id, data);
  if (steps !== undefined) await replaceGuideSteps(guide.id, steps);
  if (tagIds !== undefined) await setGuideTags(guide.id, tagIds);
  if (resourceIds !== undefined) await setGuideResources(guide.id, resourceIds);
  return NextResponse.json({ ...guide, steps: await getGuideSteps(guide.id) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteGuide(id);
  return NextResponse.json({ ok: true });
}
