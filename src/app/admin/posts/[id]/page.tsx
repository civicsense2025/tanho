import { getAdminSession } from "@/lib/auth";
import { getPostById } from "@/lib/db";
import { getPostBody } from "@/lib/content/post-content";
import { getSettings } from "@/lib/settings";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { PostForm } from "@/components/PostForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Props) {
  const settings = await getSettings();
  if (!settings.features.newsletter) notFound();
  if (!(await getAdminSession())) redirect("/admin/login");

  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();
  const body = await getPostBody(post.slug);

  return (
    <AdminPageShell title="Edit post">
      <PostForm
        postId={post.id}
        initial={{
          title: post.title,
          subtitle: post.subtitle ?? "",
          excerpt: post.excerpt ?? "",
          slug: post.slug,
          status: post.status,
          visibility: post.visibility,
          publishedAt: post.publishedAt ?? "",
          coverImage: post.coverImage ?? "",
          sortOrder: post.sortOrder,
          seoTitle: post.seoTitle ?? "",
          seoDescription: post.seoDescription ?? "",
          ogImage: post.ogImage ?? "",
          canonicalUrl: post.canonicalUrl ?? "",
          noIndex: post.noIndex === 1,
        }}
        initialBody={body}
      />
    </AdminPageShell>
  );
}
