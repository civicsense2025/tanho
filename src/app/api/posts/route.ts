import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listPosts, createPost } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminView = searchParams.get("admin") === "1" && (await getAdminSession());
  // Admin view includes drafts; public view is published-only.
  return NextResponse.json(await listPosts(!adminView));
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const post = await createPost({
    slug: body.slug || slugify(body.title),
    title: body.title,
    subtitle: body.subtitle || null,
    excerpt: body.excerpt || null,
    coverImage: body.coverImage || null,
    status: body.status || "draft",
    visibility: body.visibility === "paid" ? "paid" : "public",
    publishedAt: body.publishedAt || null,
    sortOrder: body.sortOrder || 0,
    seoTitle: body.seoTitle || null,
    seoDescription: body.seoDescription || null,
    ogImage: body.ogImage || null,
    canonicalUrl: body.canonicalUrl || null,
    noIndex: body.noIndex ? 1 : 0,
  });
  return NextResponse.json(post, { status: 201 });
}
