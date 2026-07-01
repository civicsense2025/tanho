import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listExperience, createExperience } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await listExperience());
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const experience = await createExperience({
    company: body.company,
    role: body.role,
    description: body.description || null,
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    current: body.current ? 1 : 0,
    sortOrder: body.sortOrder || 0,
  });
  return NextResponse.json(experience, { status: 201 });
}
