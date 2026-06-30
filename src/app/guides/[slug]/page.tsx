import { getGuide, getSteps, getResourcesForGuide } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import { GuideMeta } from "@/components/GuideMeta";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide || guide.status !== "published") notFound();

  const [steps, resources] = await Promise.all([
    getSteps(guide.id),
    getResourcesForGuide(guide.id),
  ]);
  const skills = parseTags(guide.skills_required);
  const requirements = parseTags(guide.requirements);

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <Link href="/guides" className="text-xs transition-colors mb-12 inline-block" style={{ color: "var(--muted)" }}>← All guides</Link>

      <header className="mb-12">
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>{guide.source_platform} → {guide.target_platform}</p>
        <h1 className="text-3xl font-medium tracking-tight mb-3" style={{ color: "var(--foreground)" }}>{guide.title}</h1>
        {guide.tagline && <p className="text-lg leading-relaxed mb-6" style={{ color: "var(--muted)" }}>{guide.tagline}</p>}
        <GuideMeta guide={guide} />
      </header>

      {guide.cover_image && (
        <div className="relative aspect-video overflow-hidden rounded-sm mb-16" style={{ background: "var(--subtle)" }}>
          <Image src={guide.cover_image} alt={guide.title} fill className="object-cover" />
        </div>
      )}

      {guide.summary && <div className="prose mb-12" dangerouslySetInnerHTML={{ __html: guide.summary }} />}

      {(skills.length > 0 || requirements.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16 p-6" style={{ border: "1px solid var(--border)" }}>
          {skills.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Skills required</h2>
              <ul className="text-sm space-y-1.5" style={{ color: "var(--muted)" }}>
                {skills.map((s) => <li key={s}>• {s}</li>)}
              </ul>
            </div>
          )}
          {requirements.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Before you start</h2>
              <ul className="text-sm space-y-1.5" style={{ color: "var(--muted)" }}>
                {requirements.map((r) => <li key={r}>• {r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {steps.length > 0 && (
        <div className="space-y-16 mb-16">
          {steps.map((step) => {
            const content = JSON.parse(step.content);
            return (
              <div key={step.id}>
                {step.title && <h2 className="text-xl font-medium mb-4" style={{ color: "var(--foreground)" }}>{step.title}</h2>}
                {step.type === "text" && <div className="prose" dangerouslySetInnerHTML={{ __html: content.html || "" }} />}
                {step.type === "image" && (
                  <figure>
                    <div className="relative overflow-hidden rounded-sm" style={{ background: "var(--subtle)" }}>
                      <Image src={content.url} alt={content.caption || ""} width={900} height={600} className="w-full h-auto" />
                    </div>
                    {content.caption && <figcaption className="text-xs mt-2 text-center" style={{ color: "var(--muted)" }}>{content.caption}</figcaption>}
                  </figure>
                )}
                {step.type === "video" && (
                  <figure>
                    <video src={content.url} controls className="w-full rounded-sm" style={{ background: "var(--subtle)" }} poster={content.poster} />
                    {content.caption && <figcaption className="text-xs mt-2 text-center" style={{ color: "var(--muted)" }}>{content.caption}</figcaption>}
                  </figure>
                )}
                {step.type === "code" && (
                  <div className="rounded-sm overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    {content.filename && (
                      <div className="text-xs px-4 py-2" style={{ background: "var(--subtle)", color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>{content.filename}</div>
                    )}
                    <pre className="text-xs p-4 overflow-x-auto font-mono" style={{ background: "var(--subtle)", color: "var(--foreground)" }}><code>{content.code}</code></pre>
                  </div>
                )}
                {step.type === "callout" && (
                  <div
                    className="prose p-4 rounded-sm text-sm"
                    style={{
                      border: `1px solid ${content.variant === "danger" ? "#c0392b" : content.variant === "warning" ? "#b58105" : "var(--border)"}`,
                      background: "var(--subtle)",
                    }}
                    dangerouslySetInnerHTML={{ __html: content.html || "" }}
                  />
                )}
                {step.type === "checklist" && (
                  <ul className="text-sm space-y-2" style={{ color: "var(--muted)" }}>
                    {((content.items as string[]) || []).map((item, i) => <li key={i}>☐ {item}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resources.length > 0 && (
        <div className="pt-12" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="text-xs uppercase tracking-widest mb-6" style={{ color: "var(--muted)" }}>Further reading</h2>
          <ul className="space-y-3">
            {resources.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium transition-colors" style={{ color: "var(--foreground)" }}>{r.title} ↗</a>
                {r.summary && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{r.summary}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
