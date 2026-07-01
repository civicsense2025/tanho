import { getContentEntry } from "@/lib/db";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { JsonLd } from "@/components/JsonLd";
import { TextLink } from "@/components/ui";
import { SubscribeForm } from "@/components/SubscribeForm";
import { ShareButtons } from "@/components/ShareButtons";
import { FeatureGate } from "@/components/FeatureGate";
import { PaywallActions } from "@/components/PaywallActions";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { renderRichText } from "@/lib/richtext/renderRichText";
import { verifyPostAccess, ACCESS_COOKIE_NAME } from "@/lib/stripe/entitlement";

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

  // Paid gating (subscription-only). A paid post's full body is served ONLY to an entitled
  // reader — a subscriber access token read from the httpOnly post_access cookie (set by the
  // email-verified /api/unlock/confirm flow) that still resolves to an ACTIVE subscription
  // (verifyPostAccess does the live re-check, so a canceled subscriber loses access even with an
  // unexpired token). The token is NEVER accepted from the URL (leaks via referer/history/logs).
  // Public posts are ungated. The body is never rendered for a non-entitled reader.
  let entitled = visibility === "public";
  if (!entitled) {
    const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
    entitled = await verifyPostAccess(token ?? undefined);
  }
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
            {/* When payments are on, offer paid subscription + unlock; otherwise the free
                newsletter opt-in. FeatureGate returns nothing (and never loads PaywallActions'
                client chunk) while payments are disabled. */}
            <FeatureGate feature="payments" fallback={<SubscribeForm />}>
              <PaywallActions />
            </FeatureGate>
          </div>
        </div>
      )}
    </main>
  );
}
