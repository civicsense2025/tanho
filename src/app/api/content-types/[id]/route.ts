import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getContentTypeById, updateContentType, deleteContentType } from "@/lib/db";
import { validateFieldDefs, type FieldDef } from "@/lib/content-types";
import { slugify } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const type = await getContentTypeById(id);
  if (!type) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(type);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.icon !== undefined) data.icon = body.icon;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  if (body.seoTitleTemplate !== undefined) data.seoTitleTemplate = body.seoTitleTemplate;
  if (body.seoDescriptionTemplate !== undefined) data.seoDescriptionTemplate = body.seoDescriptionTemplate;
  if (body.fields !== undefined) {
    const errors = validateFieldDefs(body.fields);
    if (errors.length > 0) return NextResponse.json({ error: "Invalid field definitions", details: errors }, { status: 400 });
    data.fields = JSON.stringify(body.fields as FieldDef[]);
  }
  const type = await updateContentType(id, data);
  return NextResponse.json(type);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const type = await getContentTypeById(id);
  if (!type) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (type.isBuiltIn === 1) return NextResponse.json({ error: "Built-in content types cannot be deleted" }, { status: 403 });
  await deleteContentType(id);
  return NextResponse.json({ ok: true });
}
