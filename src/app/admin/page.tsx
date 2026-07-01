import { getAdminSession } from "@/lib/auth";
import { listProjects, listExperience, listSkills, listAwards, listEducation, listGuides, listResources } from "@/lib/db";
import { redirect } from "next/navigation";
import { Badge, Button, TextLink } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

const sectionHead = {
  margin: 0,
  fontSize: "var(--text-body)",
  fontWeight: 500,
  color: "var(--text)",
} as const;

export default async function AdminPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const [projects, experiences, skills, awards, education, guides, resources] = await Promise.all([
    listProjects(false),
    listExperience(),
    listSkills(),
    listAwards(),
    listEducation(),
    listGuides({ publishedOnly: false }),
    listResources(false),
  ]);

  const summary = `${experiences.length} roles · ${skills.length} skills · ${awards.length} awards · ${education.length} schools`;

  return (
    <div style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-8) var(--gutter)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-label)",
              fontSize: "var(--text-sm)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-widest)",
              color: "var(--text-muted)",
            }}
          >
            Admin
          </h1>
          <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-xs)" }}>
            <TextLink arrow="back" muted href="/">
              View site
            </TextLink>
          </p>
        </div>
        <LogoutButton />
      </div>

      {/* Profile & résumé summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-5)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          marginBottom: "var(--space-8)",
        }}
      >
        <div>
          <div style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)", marginBottom: "var(--space-1)" }}>Profile &amp; résumé</div>
          <div
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              color: "var(--text-faint)",
            }}
          >
            {summary}
          </div>
        </div>
      </div>

      {/* Projects */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Projects</h2>
        <Button as="a" href="/admin/projects/new" size="sm" variant="outline">
          + New
        </Button>
      </div>
      {projects.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>No projects yet.</p>
      ) : (
        <div style={{ marginBottom: "var(--space-8)" }}>
          {projects.map((p, i) => (
            <div
              key={p.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{p.title}</span>
                <Badge status={p.status === "published" ? "published" : "draft"}>{p.status === "published" ? "Published" : "Draft"}</Badge>
              </div>
              <TextLink arrow="forward" muted href={`/admin/projects/${p.id}`} style={{ fontSize: "var(--text-xs)" }}>
                Edit
              </TextLink>
            </div>
          ))}
        </div>
      )}

      {/* Experience */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Experience</h2>
        <Button as="a" href="/admin/experience/new" size="sm" variant="outline">
          + New
        </Button>
      </div>
      {experiences.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>No experience entries yet.</p>
      ) : (
        <div style={{ marginBottom: "var(--space-8)" }}>
          {experiences.map((exp, i) => (
            <div
              key={exp.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{exp.role}</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{exp.company}</span>
                {exp.current === 1 && <Badge status="published">Current</Badge>}
              </div>
              <TextLink arrow="forward" muted href={`/admin/experience/${exp.id}`} style={{ fontSize: "var(--text-xs)" }}>
                Edit
              </TextLink>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Skills</h2>
        <Button as="a" href="/admin/skills/new" size="sm" variant="outline">
          + New
        </Button>
      </div>
      {skills.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>No skills yet.</p>
      ) : (
        <div style={{ marginBottom: "var(--space-8)" }}>
          {skills.map((s, i) => (
            <div
              key={s.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{s.name}</span>
                {s.category && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{s.category}</span>}
              </div>
              <TextLink arrow="forward" muted href={`/admin/skills/${s.id}`} style={{ fontSize: "var(--text-xs)" }}>
                Edit
              </TextLink>
            </div>
          ))}
        </div>
      )}

      {/* Awards */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Awards</h2>
        <Button as="a" href="/admin/awards/new" size="sm" variant="outline">
          + New
        </Button>
      </div>
      {awards.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>No awards yet.</p>
      ) : (
        <div style={{ marginBottom: "var(--space-8)" }}>
          {awards.map((award, i) => (
            <div
              key={award.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{award.title}</span>
                {award.organization && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{award.organization}</span>}
              </div>
              <TextLink arrow="forward" muted href={`/admin/awards/${award.id}`} style={{ fontSize: "var(--text-xs)" }}>
                Edit
              </TextLink>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Education</h2>
        <Button as="a" href="/admin/education/new" size="sm" variant="outline">
          + New
        </Button>
      </div>
      {education.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>No schools yet.</p>
      ) : (
        <div style={{ marginBottom: "var(--space-8)" }}>
          {education.map((ed, i) => (
            <div
              key={ed.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{ed.school}</span>
                {ed.span && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{ed.span}</span>}
              </div>
              <TextLink arrow="forward" muted href={`/admin/education/${ed.id}`} style={{ fontSize: "var(--text-xs)" }}>
                Edit
              </TextLink>
            </div>
          ))}
        </div>
      )}

      {/* Guides */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Guides</h2>
        <Button as="a" href="/admin/guides/new" size="sm" variant="outline">
          + New
        </Button>
      </div>
      {guides.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>No guides yet.</p>
      ) : (
        <div style={{ marginBottom: "var(--space-8)" }}>
          {guides.map((g, i) => (
            <div
              key={g.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{g.title}</span>
                <Badge status={g.status === "published" ? "published" : "draft"}>{g.status === "published" ? "Published" : "Draft"}</Badge>
              </div>
              <TextLink arrow="forward" muted href={`/admin/guides/${g.id}`} style={{ fontSize: "var(--text-xs)" }}>
                Edit
              </TextLink>
            </div>
          ))}
        </div>
      )}

      {/* Resources */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Resources</h2>
        <Button as="a" href="/admin/resources/new" size="sm" variant="outline">
          + New
        </Button>
      </div>
      {resources.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No resources yet.</p>
      ) : (
        <div>
          {resources.map((r, i) => (
            <div
              key={r.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{r.title}</span>
                <Badge status={r.status === "published" ? "published" : "draft"}>{r.status === "published" ? "Published" : "Draft"}</Badge>
              </div>
              <TextLink arrow="forward" muted href={`/admin/resources/${r.id}`} style={{ fontSize: "var(--text-xs)" }}>
                Edit
              </TextLink>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
