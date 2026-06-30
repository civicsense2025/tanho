import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listEducation, createEducation } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await listEducation());
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const education = await createEducation({
    school: body.school,
    degree: body.degree || null,
    span: body.span || null,
    sort_order: body.sort_order || 0,
  });
  return NextResponse.json(education, { status: 201 });
}
