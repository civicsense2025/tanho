import { getProject, getBlocks } from "@/lib/db";
import { getProjectBody } from "@/lib/content/project-content";
import { parseTags } from "@/lib/utils";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Avatar, Tag, Button, TextLink, MetricGrid, type Metric } from "@/components/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project || project.status !== "published") notFound();

  const [blocks, body] = await Promise.all([getBlocks(project.id), getProjectBody(project)]);
  const tags = parseTags(project.tags);

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
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

      {body && (
        <div className="prose" style={{ marginBottom: "var(--space-10)" }} dangerouslySetInnerHTML={{ __html: body }} />
      )}

      {blocks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          {blocks.map((block) => {
            const content = JSON.parse(block.content);
            if (block.type === "text")
              return <div key={block.id} className="prose" dangerouslySetInnerHTML={{ __html: content.html || "" }} />;
            if (block.type === "image")
              return (
                <figure key={block.id} style={{ margin: 0 }}>
                  <div style={{ position: "relative", overflow: "hidden", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}>
                    <Image src={content.url} alt={content.caption || ""} width={900} height={600} style={{ width: "100%", height: "auto" }} />
                  </div>
                  {content.caption && (
                    <figcaption style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "var(--space-2)", textAlign: "center" }}>{content.caption}</figcaption>
                  )}
                </figure>
              );
            if (block.type === "video")
              return (
                <figure key={block.id} style={{ margin: 0 }}>
                  <video src={content.url} controls style={{ width: "100%", borderRadius: "var(--radius-sm)", background: "var(--surface)" }} poster={content.poster} />
                  {content.caption && (
                    <figcaption style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "var(--space-2)", textAlign: "center" }}>{content.caption}</figcaption>
                  )}
                </figure>
              );
            if (block.type === "metric") {
              const metrics = (content.metrics as Metric[]) || [];
              return <MetricGrid key={block.id} metrics={metrics} columns={metrics.length >= 3 ? 3 : 2} />;
            }
            if (block.type === "gallery")
              return (
                <div key={block.id} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-2)" }}>
                  {(content.images as { url: string; caption?: string }[]).map((img, i) => (
                    <figure key={i} style={{ margin: 0 }}>
                      <div style={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}>
                        <Image src={img.url} alt={img.caption || ""} fill style={{ objectFit: "cover" }} />
                      </div>
                      {img.caption && <figcaption style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "var(--space-1)" }}>{img.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              );
            return null;
          })}
        </div>
      )}
    </main>
  );
}
