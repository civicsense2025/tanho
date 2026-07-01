import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getContentEntryById, updateContentEntry, deleteContentEntry, getContentTypeById, setContentEntryCollections } from "@/lib/db";
import { parseEntryData, type FieldDef } from "@/lib/content-types";
import { redactPaidEntry } from "@/lib/content-types/paywall";
import { revalidateContent } from "@/lib/cache";
import { slugify } from "@/lib/utils";
import { audit, auditContext } from "@/lib/audit";

/** Resolves a content type's slug for cache-tag revalidation. */
async function typeSlugFor(contentTypeId: string): Promise<string | undefined> {
  return (await getContentTypeById(contentTypeId))?.slug;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const entry = await getContentEntryById(id);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isAdmin = await getAdminSession();
  if (!isAdmin && entry.status !== "published") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isAdmin) return NextResponse.json(entry);
  const type = await getContentTypeById(entry.contentTypeId);
  return NextResponse.json(await redactPaidEntry(entry, type));
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
  if (Array.isArray(body.collectionIds)) {
    await setContentEntryCollections(id, body.collectionIds.map((collectionId: string, i: number) => ({ collectionId, sortOrder: i })));
  }
  // Bust the ISR cache so the edit shows on public pages immediately (Next 16 serve-stale-then-
  // revalidate). Busts the broad content tag + this entry's type.
  revalidateContent(await typeSlugFor(existing.contentTypeId));
  // Audit status transitions (publish/unpublish/schedule) — the security-relevant
  // change; log the id + new status, no content body.
  if (body.status !== undefined) {
    await audit({ ...auditContext(req), actor: "admin", action: "content.update", target: id, outcome: "success", metadata: { status: body.status } });
  }
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getContentEntryById(id);
  await deleteContentEntry(id);
  revalidateContent(existing ? await typeSlugFor(existing.contentTypeId) : undefined);
  await audit({ ...auditContext(req), actor: "admin", action: "content.delete", target: id, outcome: "success", metadata: null });
  return NextResponse.json({ ok: true });
}
