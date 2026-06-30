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
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    current: body.current ? 1 : 0,
    sort_order: body.sort_order || 0,
  });
  return NextResponse.json(experience, { status: 201 });
}
