import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listContentEntries, createContentEntry, getContentTypeBySlug, listContentTypes } from "@/lib/db";
import { parseEntryData, type FieldDef } from "@/lib/content-types";
import { redactPaidEntry } from "@/lib/content-types/paywall";
import { revalidateContent } from "@/lib/cache";
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

  // Admins already see everything (including unredacted paid bodies via the admin UI's own
  // auth), so redaction only applies to public/unauthenticated callers -- never skip this for
  // the admin case's convenience, but there's nothing to hide from an admin either.
  if (isAdmin) return NextResponse.json(entries);

  const types = await listContentTypes();
  const typesById = new Map(types.map((t) => [t.id, t]));
  const redacted = await Promise.all(entries.map((e) => redactPaidEntry(e, typesById.get(e.contentTypeId))));
  return NextResponse.json(redacted);
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
  revalidateContent(type.slug); // new entry → refresh public lists/pages for this type
  return NextResponse.json(entry, { status: 201 });
}
