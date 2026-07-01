import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getResourceById, updateResource, deleteResource, setResourcePlatforms } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const resource = await getResourceById(id);
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (await getAdminSession()) return NextResponse.json(resource);
  // Non-admins never see draft/internal-only resources or internalNotes, matching
  // the same is_public/status gating listResources() already applies to list views.
  if (resource.isPublic !== 1 || resource.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { internalNotes: _internalNotes, ...publicResource } = resource;
  return NextResponse.json(publicResource);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { platformIds, ...data } = body;
  if (data.isPublic !== undefined) data.isPublic = data.isPublic ? 1 : 0;
  if (data.noIndex !== undefined) data.noIndex = data.noIndex ? 1 : 0;
  const resource = await updateResource(id, data);
  if (platformIds !== undefined) await setResourcePlatforms(resource.id, platformIds);
  return NextResponse.json(resource);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteResource(id);
  return NextResponse.json({ ok: true });
}
