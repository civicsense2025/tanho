import { listResources } from "@/lib/db";
import { TextLink, Tag, Button } from "@/components/ui";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources — Self-Hosting Migration Guides",
  description: "A curated collection of tutorials, docs, and discussions on self-hosting and migrating off hosted platforms.",
};

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
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/guides" style={{ fontSize: "var(--text-xs)" }}>
          All guides
        </TextLink>
      </div>

      <header style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          Resources
        </h1>
        <p style={{ margin: 0, fontSize: "var(--text-lg)", lineHeight: "var(--leading-normal)", maxWidth: "var(--width-prose)", color: "var(--text-muted)" }}>
          A curated collection of tutorials, docs, and discussions on self-hosting and migrating off hosted platforms.
        </p>
        <div style={{ marginTop: "var(--space-5)" }}>
          <Button as="a" href="/guides/directory" variant="outline" size="sm">
            Tools & platforms directory
          </Button>
        </div>
      </header>

      {resources.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No resources yet.</p>
      ) : (
        <div>
          {resources.map((r, i) => (
            <div key={r.id} style={{ padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                <Tag>{TYPE_LABEL[r.resourceType] || r.resourceType}</Tag>
                {r.sourceName && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{r.sourceName}</span>}
              </div>
              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
                {r.title} ↗
              </a>
              {r.summary && <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{r.summary}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
