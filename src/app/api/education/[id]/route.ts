import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { updateEducation, deleteEducation, type Education } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  // Whitelist editable columns so only known fields reach the UPDATE clause.
  const data: Partial<Omit<Education, "id" | "created_at">> = {};
  if (typeof body.school === "string") data.school = body.school;
  if ("degree" in body) data.degree = body.degree || null;
  if ("span" in body) data.span = body.span || null;
  if (typeof body.sort_order === "number") data.sort_order = body.sort_order;
  const education = await updateEducation(Number(id), data);
  return NextResponse.json(education);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteEducation(Number(id));
  return NextResponse.json({ ok: true });
}
