import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getPostById } from "@/lib/db";
import { getPostBody, savePostBody } from "@/lib/content/post-content";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // This route returns the raw markdown body, so it must enforce the SAME gate as the public
  // post page (posts/[slug]/page.tsx) — otherwise it's a second, unguarded path to the content.
  // Non-admins may only read a published PUBLIC post's body; drafts and paid posts are withheld.
  // When real reader entitlement lands, replace `visibility === "paid"` with that predicate.
  const isAdmin = await getAdminSession();
  if (!isAdmin && (post.status !== "published" || post.visibility === "paid")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ body: await getPostBody(post.slug) });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { body } = await req.json();
  if (typeof body !== "string") return NextResponse.json({ error: "body must be a string" }, { status: 400 });
  await savePostBody(post.slug, body);
  return NextResponse.json({ ok: true });
}
