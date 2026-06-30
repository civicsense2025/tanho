import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listResources, createResource, setResourcePlatforms } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminView = searchParams.get("admin") === "1" && (await getAdminSession());
  const resources = await listResources(!adminView);
  return NextResponse.json(resources);
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const resource = await createResource({
    title: body.title,
    url: body.url,
    source_name: body.source_name || null,
    summary: body.summary || null,
    resource_type: body.resource_type || "article",
    internal_notes: body.internal_notes || null,
    is_public: body.is_public === false ? 0 : 1,
    status: body.status || "draft",
  });
  if (body.platformIds !== undefined) await setResourcePlatforms(resource.id, body.platformIds);
  return NextResponse.json(resource, { status: 201 });
}
