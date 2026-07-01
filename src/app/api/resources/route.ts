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
    sourceName: body.sourceName || null,
    summary: body.summary || null,
    resourceType: body.resourceType || "article",
    internalNotes: body.internalNotes || null,
    isPublic: body.isPublic === false ? 0 : 1,
    status: body.status || "draft",
    seoTitle: body.seoTitle || null,
    seoDescription: body.seoDescription || null,
    ogImage: body.ogImage || null,
    canonicalUrl: body.canonicalUrl || null,
    noIndex: body.noIndex ? 1 : 0,
  });
  if (body.platformIds !== undefined) await setResourcePlatforms(resource.id, body.platformIds);
  return NextResponse.json(resource, { status: 201 });
}
