import { listProjects, listExperience, listSkills, listAwards, listEducation } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import { Avatar, ProjectRow, Tag } from "@/components/ui";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        margin: "0 0 var(--space-8)",
        fontFamily: "var(--font-label)",
        fontSize: "var(--text-xs)",
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-widest)",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </h2>
  );
}

// résumé row: mono span on the left, content on the right
function Row({ span, children, last }: { span: ReactNode; children: ReactNode; last?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "9rem 1fr",
        gap: "var(--space-5)",
        padding: "var(--space-5) 0",
        borderBottom: last ? "none" : "1px solid var(--border)",
      }}
    >
      <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", color: "var(--text-faint)", paddingTop: "2px" }}>{span}</span>
      <div>{children}</div>
    </div>
  );
}

const PROFILE_BIO =
  "I'm a Forbes 30 Under 30 product designer and front-end developer. I co-founded Fiveable and scaled it from 2K to 15M+ students, securing $15M in funding along the way. I build products at the intersection of design, growth, and engineering.";

export default async function Home() {
  const [projects, experiences, skills, awards, education] = await Promise.all([
    listProjects(true),
    listExperience(),
    listSkills(),
    listAwards(),
    listEducation(),
  ]);

  const skillsByCategory = skills.reduce((acc, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s.name);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <main style={{ maxWidth: "var(--width-content)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <section style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-5)", marginBottom: "var(--space-12)" }}>
        <Avatar src="/uploads/tan-ho-profile.jpg" name="Tan Ho" size={96} />
        <div>
          <h1 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-display)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
            Tan Ho
          </h1>
          <p style={{ margin: 0, maxWidth: "36rem", fontSize: "var(--text-lg)", lineHeight: "var(--leading-relaxed)", color: "var(--text-muted)" }}>
            {PROFILE_BIO}
          </p>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-12)" }}>
        <Eyebrow>Selected Work</Eyebrow>
        {projects.length === 0 ? (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No projects yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {projects.map((p) => (
              <ProjectRow
                key={p.id}
                title={p.title}
                year={p.year}
                tagline={p.tagline}
                logo={p.logo_url}
                tags={parseTags(p.tags)}
                href={`/projects/${p.slug}`}
              />
            ))}
          </div>
        )}
      </section>

      {experiences.length > 0 && (
        <section style={{ marginBottom: "var(--space-12)" }}>
          <Eyebrow>Experience</Eyebrow>
          {experiences.map((e, i) => (
            <Row key={e.id} span={`${e.start_date ?? ""}${e.start_date ? " — " : ""}${e.current ? "Present" : e.end_date ?? ""}`} last={i === experiences.length - 1}>
              <div style={{ marginBottom: "var(--space-2)", lineHeight: "var(--leading-snug)" }}>
                <span style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)" }}>{e.role}</span>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--accent)", marginLeft: "var(--space-3)" }}>{e.company}</span>
              </div>
              {e.description && (
                <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: "var(--leading-snug)", color: "var(--text-muted)" }}>{e.description}</p>
              )}
            </Row>
          ))}
        </section>
      )}

      {Object.keys(skillsByCategory).length > 0 && (
        <section style={{ marginBottom: "var(--space-12)" }}>
          <Eyebrow>Skills</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {Object.entries(skillsByCategory).map(([group, items]) => (
              <div key={group} style={{ display: "grid", gridTemplateColumns: "9rem 1fr", gap: "var(--space-5)", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{group}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {items.map((name) => (
                    <Tag key={name}>{name}</Tag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {awards.length > 0 && (
        <section style={{ marginBottom: "var(--space-12)" }}>
          <Eyebrow>Awards</Eyebrow>
          {awards.map((a, i) => (
            <Row key={a.id} span={a.date ?? ""} last={i === awards.length - 1}>
              <span style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)", marginRight: "var(--space-3)" }}>
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    {a.title}
                  </a>
                ) : (
                  a.title
                )}
              </span>
              {a.organization && <Tag>{a.organization}</Tag>}
              {a.description && (
                <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-sm)", lineHeight: "var(--leading-snug)", color: "var(--text-muted)" }}>{a.description}</p>
              )}
            </Row>
          ))}
        </section>
      )}

      {education.length > 0 && (
        <section>
          <Eyebrow>Education</Eyebrow>
          {education.map((ed, i) => (
            <Row key={ed.id} span={ed.span ?? ""} last={i === education.length - 1}>
              <div style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)" }}>{ed.school}</div>
              {ed.degree && <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{ed.degree}</p>}
            </Row>
          ))}
        </section>
      )}
    </main>
  );
}
