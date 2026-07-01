import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listSkills, createSkill } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await listSkills());
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const skill = await createSkill({
    name: body.name,
    category: body.category || null,
    sortOrder: body.sortOrder || 0,
  });
  return NextResponse.json(skill, { status: 201 });
}
