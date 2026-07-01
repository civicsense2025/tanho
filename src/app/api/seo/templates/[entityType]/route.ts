import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getSeoTemplate, upsertSeoTemplate } from "@/lib/db";
import type { SeoEntityType } from "@/lib/db";

const VALID_ENTITY_TYPES: SeoEntityType[] = ["project", "guide", "resource", "page"];

function isValidEntityType(value: string): value is SeoEntityType {
  return (VALID_ENTITY_TYPES as string[]).includes(value);
}

type Params = { params: Promise<{ entityType: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { entityType } = await params;
  if (!isValidEntityType(entityType)) return NextResponse.json({ error: "Unknown entity type" }, { status: 404 });
  const template = await getSeoTemplate(entityType);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entityType } = await params;
  if (!isValidEntityType(entityType)) return NextResponse.json({ error: "Unknown entity type" }, { status: 404 });
  const body = await req.json();
  const template = await upsertSeoTemplate(entityType, {
    titleTemplate: typeof body.titleTemplate === "string" ? body.titleTemplate : "",
    descriptionTemplate: typeof body.descriptionTemplate === "string" ? body.descriptionTemplate : "",
  });
  return NextResponse.json(template);
}
