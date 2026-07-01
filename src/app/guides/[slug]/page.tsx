import { getGuide, getGuideSteps, getResourcesForGuide, getSeoTemplate } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";
import { GuideMeta } from "@/components/GuideMeta";
import { notFound } from "next/navigation";
import { TextLink } from "@/components/ui";
import type { Metadata } from "next";
import Image from "next/image";
import { sanitizeHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [guide, template] = await Promise.all([getGuide(slug), getSeoTemplate("guide")]);
  if (!guide) return {};
  return buildMetadata(
    guide,
    { title: guide.title, tagline: guide.tagline, coverImage: guide.coverImage, vars: { summary: guide.summary } },
    template
  );
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide || guide.status !== "published") notFound();

  const [steps, resources] = await Promise.all([
    getGuideSteps(guide.id),
    getResourcesForGuide(guide.id),
  ]);
  const skills = parseTags(guide.skillsRequired);
  const requirements = parseTags(guide.requirements);

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/guides" style={{ fontSize: "var(--text-xs)" }}>
          All guides
        </TextLink>
      </div>

      <header style={{ marginBottom: "var(--space-10)" }}>
        <p style={{ margin: "0 0 var(--space-3)", fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>
          {guide.sourcePlatform} → {guide.targetPlatform}
        </p>
        <h1 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          {guide.title}
        </h1>
        {guide.tagline && (
          <p style={{ margin: "0 0 var(--space-5)", fontSize: "var(--text-lg)", lineHeight: "var(--leading-normal)", color: "var(--text-muted)" }}>
            {guide.tagline}
          </p>
        )}
        <GuideMeta guide={guide} />
      </header>

      {guide.coverImage && (
        <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden", borderRadius: "var(--radius-sm)", background: "var(--surface)", marginBottom: "var(--space-10)" }}>
          <Image src={guide.coverImage} alt={guide.title} fill style={{ objectFit: "cover" }} />
        </div>
      )}

      {guide.summary && <div style={{ marginBottom: "var(--space-8)", color: "var(--text)" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(guide.summary) }} />}

      {(skills.length > 0 || requirements.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-8)", marginBottom: "var(--space-10)", padding: "var(--space-5)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          {skills.length > 0 && (
            <div>
              <h2 style={{ margin: "0 0 var(--space-3)", fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-muted)" }}>
                Skills required
              </h2>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                {skills.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          )}
          {requirements.length > 0 && (
            <div>
              <h2 style={{ margin: "0 0 var(--space-3)", fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-muted)" }}>
                Before you start
              </h2>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                {requirements.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {steps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)", marginBottom: "var(--space-10)" }}>
          {steps.map((step) => {
            const content = JSON.parse(step.content);
            return (
              <div key={step.id}>
                {step.title && (
                  <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-h2)", fontWeight: 500, color: "var(--text)" }}>{step.title}</h2>
                )}
                {step.type === "text" && <div style={{ color: "var(--text)" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html || "") }} />}
                {step.type === "image" && (
                  <figure style={{ margin: 0 }}>
                    <div style={{ position: "relative", overflow: "hidden", borderRadius: "var(--radius-sm)", background: "var(--surface)" }}>
                      <Image src={content.url} alt={content.caption || ""} width={900} height={600} style={{ width: "100%", height: "auto" }} />
                    </div>
                    {content.caption && (
                      <figcaption style={{ marginTop: "var(--space-2)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        {content.caption}
                      </figcaption>
                    )}
                  </figure>
                )}
                {step.type === "video" && (
                  <figure style={{ margin: 0 }}>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={content.url} controls style={{ width: "100%", borderRadius: "var(--radius-sm)", background: "var(--surface)" }} poster={content.poster} />
                    {content.caption && (
                      <figcaption style={{ marginTop: "var(--space-2)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        {content.caption}
                      </figcaption>
                    )}
                  </figure>
                )}
                {step.type === "code" && (
                  <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
                    {content.filename && (
                      <div style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-xs)", background: "var(--surface)", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                        {content.filename}
                      </div>
                    )}
                    <pre style={{ margin: 0, padding: "var(--space-4)", overflowX: "auto", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", background: "var(--surface)", color: "var(--text)" }}>
                      <code>{content.code}</code>
                    </pre>
                  </div>
                )}
                {step.type === "callout" && (
                  <div
                    style={{
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--text-sm)",
                      color: "var(--text)",
                      background: "var(--surface)",
                      border: `1px solid ${content.variant === "danger" ? "var(--danger)" : content.variant === "warning" ? "var(--accent-2)" : "var(--border)"}`,
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html || "") }}
                  />
                )}
                {step.type === "checklist" && (
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {((content.items as string[]) || []).map((item, i) => (
                      <li key={i}>☐ {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resources.length > 0 && (
        <div style={{ paddingTop: "var(--space-8)", borderTop: "1px solid var(--border)" }}>
          <h2 style={{ margin: "0 0 var(--space-5)", fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-muted)" }}>
            Further reading
          </h2>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {resources.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
                  {r.title} ↗
                </a>
                {r.summary && <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{r.summary}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
