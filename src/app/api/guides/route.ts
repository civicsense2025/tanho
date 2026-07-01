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
    sourcePlatform: body.sourcePlatform,
    targetPlatform: body.targetPlatform,
    difficulty: body.difficulty || "intermediate",
    effortHoursMin: body.effortHoursMin ?? null,
    effortHoursMax: body.effortHoursMax ?? null,
    costMinUsd: body.costMinUsd ?? null,
    costMaxUsd: body.costMaxUsd ?? null,
    costPeriod: body.costPeriod || "monthly",
    skillsRequired: JSON.stringify(body.skillsRequired || []),
    requirements: JSON.stringify(body.requirements || []),
    coverImage: body.coverImage || null,
    status: body.status || "draft",
    sortOrder: body.sortOrder || 0,
    seoTitle: body.seoTitle || null,
    seoDescription: body.seoDescription || null,
    ogImage: body.ogImage || null,
    canonicalUrl: body.canonicalUrl || null,
    noIndex: body.noIndex ? 1 : 0,
  });
  return NextResponse.json(guide, { status: 201 });
}
