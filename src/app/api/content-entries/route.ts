import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listContentEntries, createContentEntry, getContentTypeBySlug } from "@/lib/db";
import { parseEntryData, type FieldDef } from "@/lib/content-types";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isAdmin = await getAdminSession();
  const contentTypeId = searchParams.get("contentTypeId") || undefined;
  const typeSlug = searchParams.get("type") || undefined;
  const status = searchParams.get("status") as "draft" | "published" | "scheduled" | undefined;
  const publishedOnly = !isAdmin;

  let resolvedTypeId = contentTypeId;
  if (!resolvedTypeId && typeSlug) {
    const type = await getContentTypeBySlug(typeSlug);
    if (!type) return NextResponse.json([]);
    resolvedTypeId = type.id;
  }

  const entries = await listContentEntries({
    contentTypeId: resolvedTypeId,
    status: isAdmin ? status : undefined,
    publishedOnly,
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const type = await getContentTypeBySlug(body.typeSlug || body.contentTypeId);
  if (!type) return NextResponse.json({ error: "Content type not found" }, { status: 400 });

  const fields: FieldDef[] = JSON.parse(type.fields);
  const { data } = parseEntryData(fields, body.data || {});

  const entry = await createContentEntry({
    contentTypeId: type.id,
    slug: body.slug || slugify(body.title),
    title: body.title,
    status: body.status || "draft",
    scheduledAt: body.scheduledAt || null,
    publishedAt: body.publishedAt || null,
    sortOrder: body.sortOrder || 0,
    seoTitle: body.seoTitle || null,
    seoDescription: body.seoDescription || null,
    ogImage: body.ogImage || null,
    canonicalUrl: body.canonicalUrl || null,
    noIndex: body.noIndex ? 1 : 0,
    data: JSON.stringify(data),
  });
  return NextResponse.json(entry, { status: 201 });
}
