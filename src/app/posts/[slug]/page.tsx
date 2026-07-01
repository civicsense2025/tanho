import { getPost, getSeoTemplate } from "@/lib/db";
import { renderPostBody } from "@/lib/content/post-content";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { JsonLd } from "@/components/JsonLd";
import { TextLink } from "@/components/ui";
import { SubscribeForm } from "@/components/SubscribeForm";
import { ShareButtons } from "@/components/ShareButtons";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [post, template] = await Promise.all([getPost(slug), getSeoTemplate("post")]);
  if (!post) return {};
  return buildMetadata(
    post,
    { title: post.title, tagline: post.excerpt, coverImage: post.coverImage, path: `/posts/${post.slug}`, vars: { excerpt: post.excerpt } },
    template
  );
}

export default async function PostPage({ params }: Props) {
  const settings = await getSettings();
  if (!settings.features.newsletter) notFound();
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.status !== "published") notFound();

  // Paid gating: entitlement is added in a later phase. Until then a paid post shows its
  // excerpt + a subscribe prompt to everyone; the full body is only rendered for public posts,
  // so paid content is never served to a non-entitled reader (server-side decision).
  const entitled = post.visibility === "public";
  const bodyHtml = entitled ? await renderPostBody(slug) : "";

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt || undefined,
          datePublished: post.publishedAt || undefined,
          dateModified: post.updatedAt,
          url: absoluteUrl(`/posts/${post.slug}`),
          author: { "@type": "Person", name: settings.author },
        }}
      />

      <div style={{ marginBottom: "var(--space-6)" }}>
        <TextLink arrow="back" muted href="/posts" style={{ fontSize: "var(--text-xs)" }}>
          All posts
        </TextLink>
      </div>

      <header style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          {post.title}
        </h1>
        {post.subtitle && <p style={{ margin: 0, fontSize: "var(--text-lg)", color: "var(--text-muted)" }}>{post.subtitle}</p>}
      </header>

      <div style={{ marginBottom: "var(--space-8)" }}>
        <ShareButtons url={absoluteUrl(`/posts/${post.slug}`)} title={post.title} />
      </div>

      {entitled ? (
        <div className="prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      ) : (
        <div>
          {post.excerpt && <p style={{ fontSize: "var(--text-lg)", color: "var(--text-muted)", lineHeight: "var(--leading-normal)" }}>{post.excerpt}</p>}
          <div style={{ marginTop: "var(--space-8)", padding: "var(--space-6)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)" }}>
            <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text)" }}>
              This is a subscriber-only post. Subscribe to read the rest.
            </p>
            <SubscribeForm />
          </div>
        </div>
      )}
    </main>
  );
}
