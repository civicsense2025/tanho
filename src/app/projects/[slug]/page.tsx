import { getProject, getProjectById, getBlocks, getSeoTemplate } from "@/lib/db";
import { getProjectBody } from "@/lib/content/project-content";
import { getAdminSession } from "@/lib/auth";
import { parseTags } from "@/lib/utils";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { Avatar, Tag, Button, TextLink } from "@/components/ui";
import { BlockTree } from "@/components/BlockTree";
import { PreviewFrame } from "@/components/PreviewFrame";
import { JsonLd } from "@/components/JsonLd";
import { sanitizeHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string; id?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [project, template] = await Promise.all([getProject(slug), getSeoTemplate("project")]);
  if (!project) return {};
  return buildMetadata(
    project,
    { title: project.title, tagline: project.tagline, coverImage: project.coverImage, path: `/projects/${project.slug}` },
    template
  );
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview, id } = await searchParams;

  // Preview mode looks up by id (not slug) so an in-progress slug edit --
  // not yet saved -- doesn't 404 the preview the admin is actively looking
  // at. Gated server-side the same way draft project bodies are: admin only.
  const isPreview = preview === "1";
  let project = isPreview && id ? await getProjectById(id) : await getProject(slug);
  if (isPreview) {
    if (!project || !(await getAdminSession())) notFound();
  } else if (!project || project.status !== "published") {
    notFound();
  }
  project = project!;

  const [blocks, body] = await Promise.all([getBlocks(project.id), getProjectBody(project)]);
  const tags = parseTags(project.tags);

  // Same override/template/fallback-resolved fields generateMetadata() computed for <head>,
  // reused here so JSON-LD never diverges from the visible SEO tags. Skipped in preview mode --
  // an in-progress admin preview isn't the canonical public page this schema describes.
  const seoTemplate = !isPreview ? await getSeoTemplate("project") : undefined;
  const resolved = !isPreview
    ? buildMetadata(
        project,
        { title: project.title, tagline: project.tagline, coverImage: project.coverImage, path: `/projects/${project.slug}` },
        seoTemplate
      )
    : null;

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      {resolved && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: resolved.title as string,
            description: resolved.description as string | undefined,
            image: project.coverImage || undefined,
            url: absoluteUrl(`/projects/${project.slug}`),
            dateModified: project.updatedAt,
            author: { "@type": "Person", name: "Tan Ho" },
          }}
        />
      )}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/" style={{ fontSize: "var(--text-xs)" }}>
          Back
        </TextLink>
      </div>

      <header style={{ marginBottom: "var(--space-10)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-5)", marginBottom: "var(--space-5)" }}>
          <Avatar src={project.logoUrl} name={project.title} size={64} rounded="square" />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-3)" }}>
              <h1 style={{ margin: 0, fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
                {project.title}
              </h1>
              {project.year && (
                <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-sm)", color: "var(--text-faint)" }}>{project.year}</span>
              )}
            </div>
            {project.tagline && (
              <p style={{ margin: 0, fontSize: "var(--text-lg)", lineHeight: "var(--leading-snug)", color: "var(--text-muted)" }}>{project.tagline}</p>
            )}
          </div>
        </div>

        {(project.liveUrl || project.githubUrl) && (
          <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
            {project.liveUrl && (
              <Button as="a" href={project.liveUrl} target="_blank" rel="noopener noreferrer" variant="outline" size="sm">
                Live ↗
              </Button>
            )}
            {project.githubUrl && (
              <Button as="a" href={project.githubUrl} target="_blank" rel="noopener noreferrer" variant="ghost" size="sm" uppercase>
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

      {project.coverImage ? (
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
          <Image src={project.coverImage} alt={project.title} fill style={{ objectFit: "cover" }} />
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
          <span
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              color: "var(--text-faint)",
            }}
          >
            Cover image
          </span>
        </div>
      )}

      {isPreview ? (
        <PreviewFrame
          initialBody={body}
          initialBlocks={blocks.map((b) => ({ id: b.id, type: b.type, content: JSON.parse(b.content) }))}
        />
      ) : (
        <>
          {body && (
            <div className="prose" style={{ marginBottom: "var(--space-10)" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }} />
          )}
          {blocks.length > 0 && (
            <BlockTree blocks={blocks.map((b) => ({ id: b.id, type: b.type, content: JSON.parse(b.content) }))} />
          )}
        </>
      )}
    </main>
  );
}
