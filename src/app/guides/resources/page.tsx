import { listResources } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  article: "Article",
  video: "Video",
  forum_thread: "Forum thread",
  docs: "Docs",
  tool: "Tool",
};

export default async function ResourcesPage() {
  const resources = await listResources(true);

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <Link href="/guides" className="text-xs transition-colors mb-12 inline-block" style={{ color: "var(--muted)" }}>← All guides</Link>

      <header className="mb-12">
        <h1 className="text-3xl font-medium tracking-tight mb-3" style={{ color: "var(--foreground)" }}>Resources</h1>
        <p className="text-lg leading-relaxed max-w-xl" style={{ color: "var(--muted)" }}>
          A curated collection of tutorials, docs, and discussions on self-hosting and migrating off hosted platforms.
        </p>
      </header>

      {resources.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>No resources yet.</p>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {resources.map((r) => (
            <div key={r.id} className="py-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
                  {TYPE_LABEL[r.resource_type] || r.resource_type}
                </span>
                {r.source_name && <span className="text-xs" style={{ color: "var(--muted)" }}>{r.source_name}</span>}
              </div>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium transition-colors" style={{ color: "var(--foreground)" }}>{r.title} ↗</a>
              {r.summary && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{r.summary}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
