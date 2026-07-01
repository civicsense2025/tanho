import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listCollections, createCollection } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  return NextResponse.json(await listCollections());
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const collection = await createCollection({
    slug: body.slug || slugify(body.name),
    name: body.name,
    description: body.description || null,
    sortOrder: body.sortOrder || 0,
  });
  return NextResponse.json(collection, { status: 201 });
}
