import { getContentEntry, getContentTypeBySlug } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { absoluteImage, absoluteUrl, buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { Avatar, Tag, Button, TextLink } from "@/components/ui";
import { BlockTree } from "@/components/BlockTree";
import { JsonLd } from "@/components/JsonLd";
import { ShareButtons } from "@/components/ShareButtons";
import type { Block } from "@/lib/blocks/types";

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
  const entry = await getContentEntry("project", slug);
  if (!entry || entry.status !== "published") return {};
  const data = parseData(entry.data);
  return buildMetadata(
    entry,
    { title: entry.title, tagline: data.tagline ? String(data.tagline) : null, coverImage: data.coverImage ? String(data.coverImage) : null, path: `/projects/${entry.slug}` }
  );
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const [entry, settings] = await Promise.all([getContentEntry("project", slug), getSettings()]);
  if (!entry || entry.status !== "published") {
    if (entry && (await getAdminSession())) {
      // Admin preview of draft
    } else {
      notFound();
    }
  }
  const data = parseData(entry!.data);
  const tagline = data.tagline ? String(data.tagline) : null;
  const coverImage = data.coverImage ? String(data.coverImage) : null;
  const logoUrl = data.logoUrl ? String(data.logoUrl) : null;
  const liveUrl = data.liveUrl ? String(data.liveUrl) : null;
  const githubUrl = data.githubUrl ? String(data.githubUrl) : null;
  const year = data.year != null ? Number(data.year) : null;
  const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
  const blocks = ((data.blocks as Block[]) || []).map((b, i) => ({ ...b, id: i }));

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: entry!.title,
          description: tagline || undefined,
          image: coverImage ? absoluteImage(coverImage) : undefined,
          url: absoluteUrl(`/projects/${entry!.slug}`),
          dateModified: entry!.updatedAt,
          author: { "@type": "Person", name: settings.author },
        }}
      />
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/" style={{ fontSize: "var(--text-xs)" }}>
          Back
        </TextLink>
      </div>

      <header style={{ marginBottom: "var(--space-10)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-5)", marginBottom: "var(--space-5)" }}>
          <Avatar src={logoUrl} name={entry!.title} size={64} rounded="square" />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-3)" }}>
              <h1 style={{ margin: 0, fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
                {entry!.title}
              </h1>
              {year != null && (
                <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-sm)", color: "var(--text-faint)" }}>{year}</span>
              )}
            </div>
            {tagline && (
              <p style={{ margin: 0, fontSize: "var(--text-lg)", lineHeight: "var(--leading-snug)", color: "var(--text-muted)" }}>{tagline}</p>
            )}
          </div>
        </div>

        {(liveUrl || githubUrl) && (
          <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
            {liveUrl && (
              <Button as="a" href={liveUrl} target="_blank" rel="noopener noreferrer" variant="outline" size="sm">
                Live ↗
              </Button>
            )}
            {githubUrl && (
              <Button as="a" href={githubUrl} target="_blank" rel="noopener noreferrer" variant="ghost" size="sm" uppercase>
                GitHub ↗
              </Button>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
      </header>

      <div style={{ marginBottom: "var(--space-10)" }}>
        <ShareButtons url={absoluteUrl(`/projects/${entry!.slug}`)} title={entry!.title} />
      </div>

      {coverImage ? (
        <div
          style={{
            position: "relative",
            aspectRatio: "16 / 9",
            overflow: "hidden",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            marginBottom: "var(--space-10)",
          }}
        >
          <Image src={coverImage} alt={entry!.title} fill style={{ objectFit: "cover" }} />
        </div>
      ) : (
        <div
          style={{
            aspectRatio: "16 / 9",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "var(--space-10)",
          }}
        >
          <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
            Cover image
          </span>
        </div>
      )}

      {blocks.length > 0 && <BlockTree blocks={blocks} />}
    </main>
  );
}
