import { getContentEntry } from "@/lib/db";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { JsonLd } from "@/components/JsonLd";
import { ShareButtons } from "@/components/ShareButtons";
import { notFound } from "next/navigation";
import { TextLink } from "@/components/ui";
import type { Metadata } from "next";
import Image from "next/image";
import { renderRichText } from "@/lib/richtext/renderRichText";
import type { Block } from "@/lib/blocks/types";
import { parseBlocks } from "@/lib/blocks/core/validate";
import { BlockTree } from "@/components/BlockTree";
import { Tag } from "@/components/ui";

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
  const entry = await getContentEntry("guide", slug);
  if (!entry || entry.status !== "published") return {};
  const data = parseData(entry.data);
  return buildMetadata(
    entry,
    { title: entry.title, tagline: data.tagline ? String(data.tagline) : null, coverImage: data.coverImage ? String(data.coverImage) : null, path: `/guides/${entry.slug}`, vars: { summary: data.summary ? String(data.summary) : "" } }
  );
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const [entry, settings] = await Promise.all([getContentEntry("guide", slug), getSettings()]);
  if (!entry || entry.status !== "published") notFound();
  if (!settings.features.guides) notFound();

  const data = parseData(entry.data);
  const coverImage = data.coverImage ? String(data.coverImage) : null;
  const tagline = data.tagline ? String(data.tagline) : null;
  const summary = data.summary ? String(data.summary) : null;
  // parseBlocks() is the same trust-boundary validator the homepage already uses -- a malformed
  // or unregistered block type is dropped with a warning instead of crashing the render.
  const blocks = parseBlocks({ blocks: data.blocks }).map((b, i) => ({ ...b, id: i, type: b.type as Block["type"] }));
  const skillsRequired = Array.isArray(data.skillsRequired) ? (data.skillsRequired as string[]) : [];
  const requirements = Array.isArray(data.requirements) ? (data.requirements as string[]) : [];

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          name: entry.title,
          description: summary || undefined,
          image: coverImage ? absoluteUrl(coverImage) : undefined,
          url: absoluteUrl(`/guides/${entry.slug}`),
          dateModified: entry.updatedAt,
          author: { "@type": "Person", name: settings.author },
        }}
      />
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/guides" style={{ fontSize: "var(--text-xs)" }}>
          Back to guides
        </TextLink>
      </div>

      <header style={{ marginBottom: "var(--space-10)" }}>
        <h1 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          {entry.title}
        </h1>
        {tagline && (
          <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)", lineHeight: "var(--leading-snug)", color: "var(--text-muted)" }}>{tagline}</p>
        )}
        {summary && (
          <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-base)", lineHeight: "var(--leading-normal)", color: "var(--text-muted)" }}>{summary}</p>
        )}
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {data.difficulty ? <span>Difficulty: {String(data.difficulty)}</span> : null}
          {data.sourcePlatform ? <span>From: {String(data.sourcePlatform)}</span> : null}
          {data.targetPlatform ? <span>To: {String(data.targetPlatform)}</span> : null}
        </div>
      </header>

      <div style={{ marginBottom: "var(--space-10)" }}>
        <ShareButtons url={absoluteUrl(`/guides/${entry.slug}`)} title={entry.title} />
      </div>

      {coverImage && (
        <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-10)" }}>
          <Image src={coverImage} alt={entry.title} fill style={{ objectFit: "cover" }} />
        </div>
      )}

      {(skillsRequired.length > 0 || requirements.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-8)", marginBottom: "var(--space-10)", paddingBottom: "var(--space-8)", borderBottom: "1px solid var(--border)" }}>
          {skillsRequired.length > 0 && (
            <div>
              <h2 style={{ margin: "0 0 var(--space-3)", fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-muted)" }}>
                Skills required
              </h2>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {skillsRequired.map((s) => <Tag key={s}>{s}</Tag>)}
              </div>
            </div>
          )}
          {requirements.length > 0 && (
            <div>
              <h2 style={{ margin: "0 0 var(--space-3)", fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-muted)" }}>
                Requirements
              </h2>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {requirements.map((r) => <Tag key={r}>{r}</Tag>)}
              </div>
            </div>
          )}
        </div>
      )}

      {blocks.length > 0 && <BlockTree blocks={blocks} />}
    </main>
  );
}
