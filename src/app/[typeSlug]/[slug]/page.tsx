import { getContentEntry, getContentTypeBySlug } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BlockTree } from "@/components/BlockTree";
import { JsonLd } from "@/components/JsonLd";
import { ShareButtons } from "@/components/ShareButtons";
import { TextLink } from "@/components/ui";
import { renderRichText } from "@/lib/richtext/renderRichText";
import type { Block } from "@/lib/blocks/types";
import { parseBlocks } from "@/lib/blocks/core/validate";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ typeSlug: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { typeSlug, slug } = await params;
  const [entry, type] = await Promise.all([getContentEntry(typeSlug, slug), getContentTypeBySlug(typeSlug)]);
  if (!entry || !type) return {};
  if (entry.status !== "published") return {};
  const data = parseData(entry.data);
  return buildMetadata(
    entry,
    { title: entry.title, path: `/${typeSlug}/${entry.slug}` },
    undefined
  );
}

function parseData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default async function GenericEntryPage({ params }: Props) {
  const { typeSlug, slug } = await params;
  const [entry, type, settings] = await Promise.all([
    getContentEntry(typeSlug, slug),
    getContentTypeBySlug(typeSlug),
    getSettings(),
  ]);

  if (!entry || !type) notFound();

  // Non-admin only sees published entries.
  if (entry.status !== "published" && !(await getAdminSession())) notFound();

  const data = parseData(entry.data);

  // Render block-list fields via BlockTree, richtext fields via renderRichText, others as plain text.
  const blockFields = parseFields(type.fields).filter((f) => f.kind === "block-list");
  const richtextFields = parseFields(type.fields).filter((f) => f.kind === "richtext");

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/" style={{ fontSize: "var(--text-xs)" }}>
          Back
        </TextLink>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: entry.title,
          url: absoluteUrl(`/${typeSlug}/${entry.slug}`),
          dateModified: entry.updatedAt,
          author: { "@type": "Person", name: settings.author },
        }}
      />

      <h1 style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
        {entry.title}
      </h1>

      <div style={{ marginBottom: "var(--space-10)" }}>
        <ShareButtons url={absoluteUrl(`/${typeSlug}/${entry.slug}`)} title={entry.title} />
      </div>

      {richtextFields.map((field) => {
        const html = renderRichText(String(data[field.key] || ""));
        return html ? (
          <div key={field.key} className="prose" style={{ marginBottom: "var(--space-10)" }} dangerouslySetInnerHTML={{ __html: html }} />
        ) : null;
      })}

      {blockFields.map((field) => {
        // parseBlocks() is the same trust-boundary validator the homepage already uses -- a
        // malformed or unregistered block type is dropped with a warning instead of crashing.
        const items = parseBlocks({ blocks: data[field.key] }).map((b, i) => ({ ...b, id: i, type: b.type as Block["type"] }));
        return items.length > 0 ? <BlockTree key={field.key} blocks={items} /> : null;
      })}
    </main>
  );
}

function parseFields(fieldsJson: string): Array<{ key: string; kind: string }> {
  try {
    return JSON.parse(fieldsJson) as Array<{ key: string; kind: string }>;
  } catch {
    return [];
  }
}
