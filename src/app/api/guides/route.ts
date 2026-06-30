import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listGuides, createGuide, GuideDifficulty } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminView = searchParams.get("admin") === "1" && (await getAdminSession());
  const guides = await listGuides({
    publishedOnly: !adminView,
    sourcePlatform: searchParams.get("source") || undefined,
    targetPlatform: searchParams.get("target") || undefined,
    maxDifficulty: (searchParams.get("maxDifficulty") as GuideDifficulty) || undefined,
  });
  return NextResponse.json(guides);
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const guide = await createGuide({
    slug: body.slug || slugify(body.title),
    title: body.title,
    tagline: body.tagline || null,
    summary: body.summary || null,
    source_platform: body.source_platform,
    target_platform: body.target_platform,
    difficulty: body.difficulty || "intermediate",
    effort_hours_min: body.effort_hours_min ?? null,
    effort_hours_max: body.effort_hours_max ?? null,
    cost_min_usd: body.cost_min_usd ?? null,
    cost_max_usd: body.cost_max_usd ?? null,
    cost_period: body.cost_period || "monthly",
    skills_required: JSON.stringify(body.skills_required || []),
    requirements: JSON.stringify(body.requirements || []),
    cover_image: body.cover_image || null,
    status: body.status || "draft",
    sort_order: body.sort_order || 0,
  });
  return NextResponse.json(guide, { status: 201 });
}
