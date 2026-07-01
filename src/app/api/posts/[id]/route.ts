import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getPostById, updatePost, deletePost, type Post } from "@/lib/db";
import { deletePostMdx } from "@/lib/content/store";
import { slugify } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isAdmin = await getAdminSession();
  if (!isAdmin && post.status !== "published") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  // Explicit whitelist — never spread the raw body into the update (mass-assignment guard).
  const data: Partial<Omit<Post, "id" | "createdAt" | "updatedAt">> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.slug !== undefined) data.slug = body.slug || slugify(body.title || "");
  if (body.subtitle !== undefined) data.subtitle = body.subtitle || null;
  if (body.excerpt !== undefined) data.excerpt = body.excerpt || null;
  if (body.coverImage !== undefined) data.coverImage = body.coverImage || null;
  if (body.status !== undefined) data.status = body.status;
  if (body.visibility !== undefined) data.visibility = body.visibility === "paid" ? "paid" : "public";
  if (body.publishedAt !== undefined) data.publishedAt = body.publishedAt || null;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle || null;
  if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription || null;
  if (body.ogImage !== undefined) data.ogImage = body.ogImage || null;
  if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl || null;
  if (body.noIndex !== undefined) data.noIndex = body.noIndex ? 1 : 0;

  const post = await updatePost(id, data);
  return NextResponse.json(post);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const post = await getPostById(id);
  await deletePost(id);
  if (post) await deletePostMdx(post.slug);
  return NextResponse.json({ ok: true });
}
