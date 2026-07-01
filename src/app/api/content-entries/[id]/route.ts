import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getContentEntryById, updateContentEntry, deleteContentEntry, getContentTypeById } from "@/lib/db";
import { parseEntryData, type FieldDef } from "@/lib/content-types";
import { slugify } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const entry = await getContentEntryById(id);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isAdmin = await getAdminSession();
  if (!isAdmin && entry.status !== "published") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const existing = await getContentEntryById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.status !== undefined) data.status = body.status;
  if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt;
  if (body.publishedAt !== undefined) data.publishedAt = body.publishedAt;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
  if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
  if (body.ogImage !== undefined) data.ogImage = body.ogImage;
  if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
  if (body.noIndex !== undefined) data.noIndex = body.noIndex ? 1 : 0;

  if (body.data !== undefined) {
    const type = await getContentTypeById(existing.contentTypeId);
    if (type) {
      const fields: FieldDef[] = JSON.parse(type.fields);
      const { data: parsed } = parseEntryData(fields, body.data);
      data.data = JSON.stringify(parsed);
    }
  }

  const entry = await updateContentEntry(id, data);
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteContentEntry(id);
  return NextResponse.json({ ok: true });
}
