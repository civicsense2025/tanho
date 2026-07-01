import { listContentEntries, getContentTypeBySlug } from "@/lib/db";
import { ProjectRow } from "@/components/ui";
import { Eyebrow } from "./Eyebrow";

function parseData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function ProjectListBlock({ heading = "Selected Work" }: { heading?: string }) {
  const projectType = await getContentTypeBySlug("project");
  const entries = projectType ? await listContentEntries({ contentTypeId: projectType.id, publishedOnly: true }) : [];

  return (
    <section style={{ marginBottom: "var(--space-12)" }}>
      <Eyebrow>{heading}</Eyebrow>
      {entries.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No projects yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {entries.map((e) => {
            const data = parseData(e.data);
            const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
            return (
              <ProjectRow
                key={e.id}
                title={e.title}
                year={data.year ? Number(data.year) : null}
                tagline={data.tagline ? String(data.tagline) : null}
                logo={data.logoUrl ? String(data.logoUrl) : null}
                tags={tags}
                href={`/projects/${e.slug}`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
