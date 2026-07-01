import { getContentEntry } from "@/lib/db";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { JsonLd } from "@/components/JsonLd";
import { TextLink } from "@/components/ui";
import { SubscribeForm } from "@/components/SubscribeForm";
import { ShareButtons } from "@/components/ShareButtons";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { renderRichText } from "@/lib/richtext/renderRichText";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function parseData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getContentEntry("post", slug);
  if (!entry || entry.status !== "published") return {};
  const data = parseData(entry.data);
  return buildMetadata(
    entry,
    { title: entry.title, tagline: data.excerpt ? String(data.excerpt) : null, coverImage: data.coverImage ? String(data.coverImage) : null, path: `/posts/${entry.slug}`, vars: { excerpt: data.excerpt ? String(data.excerpt) : "" } }
  );
}

export default async function PostPage({ params }: Props) {
  const settings = await getSettings();
  if (!settings.features.newsletter) notFound();
  const { slug } = await params;
  const entry = await getContentEntry("post", slug);
  if (!entry || entry.status !== "published") notFound();

  const data = parseData(entry.data);
  const subtitle = data.subtitle ? String(data.subtitle) : null;
  const excerpt = data.excerpt ? String(data.excerpt) : null;
  const visibility = data.visibility ? String(data.visibility) : "public";

  // Paid gating: entitlement is added in a later phase. Until then a paid post shows its
  // excerpt + a subscribe prompt to everyone; the full body is only rendered for public posts,
  // so paid content is never served to a non-entitled reader (server-side decision).
  const entitled = visibility === "public";
  const bodyHtml = entitled ? renderRichText(String(data.body || "")) : "";

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: entry.title,
          description: excerpt || undefined,
          datePublished: entry.publishedAt || undefined,
          dateModified: entry.updatedAt,
          url: absoluteUrl(`/posts/${entry.slug}`),
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
          {entry.title}
        </h1>
        {subtitle && <p style={{ margin: 0, fontSize: "var(--text-lg)", color: "var(--text-muted)" }}>{subtitle}</p>}
      </header>

      <div style={{ marginBottom: "var(--space-8)" }}>
        <ShareButtons url={absoluteUrl(`/posts/${entry.slug}`)} title={entry.title} />
      </div>

      {entitled ? (
        <div className="prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      ) : (
        <div>
          {excerpt && <p style={{ fontSize: "var(--text-lg)", color: "var(--text-muted)", lineHeight: "var(--leading-normal)" }}>{excerpt}</p>}
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
