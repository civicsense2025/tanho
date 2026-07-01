import { listProjects } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import { ProjectRow } from "@/components/ui";
import { Eyebrow } from "./Eyebrow";

export async function ProjectListBlock({ heading = "Selected Work" }: { heading?: string }) {
  const projects = await listProjects(true);

  return (
    <section style={{ marginBottom: "var(--space-12)" }}>
      <Eyebrow>{heading}</Eyebrow>
      {projects.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No projects yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {projects.map((p) => (
            <ProjectRow key={p.id} title={p.title} year={p.year} tagline={p.tagline} logo={p.logoUrl} tags={parseTags(p.tags)} href={`/projects/${p.slug}`} />
          ))}
        </div>
      )}
    </section>
  );
}
