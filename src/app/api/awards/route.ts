import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listAwards, createAward } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await listAwards());
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const award = await createAward({
    title: body.title,
    organization: body.organization || null,
    description: body.description || null,
    date: body.date || null,
    url: body.url || null,
    sort_order: body.sort_order || 0,
  });
  return NextResponse.json(award, { status: 201 });
}
