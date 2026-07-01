import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listContentTypes, createContentType } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { validateFieldDefs, type FieldDef } from "@/lib/content-types";

export async function GET() {
  const isAdmin = await getAdminSession();
  const types = await listContentTypes();
  // Non-admin callers only see built-in types (custom types are admin-internal schema).
  const visible = isAdmin ? types : types.filter((t) => t.isBuiltIn === 1);
  return NextResponse.json(visible);
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const fields: FieldDef[] = body.fields || [];
  const errors = validateFieldDefs(fields);
  if (errors.length > 0) return NextResponse.json({ error: "Invalid field definitions", details: errors }, { status: 400 });
  const type = await createContentType({
    slug: body.slug || slugify(body.name),
    name: body.name,
    icon: body.icon || null,
    fields: JSON.stringify(fields),
    isBuiltIn: 0,
    sortOrder: body.sortOrder || 0,
    seoTitleTemplate: body.seoTitleTemplate || null,
    seoDescriptionTemplate: body.seoDescriptionTemplate || null,
  });
  return NextResponse.json(type, { status: 201 });
}
