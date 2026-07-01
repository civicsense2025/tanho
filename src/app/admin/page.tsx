import { getAdminSession } from "@/lib/auth";
import { listContentTypes, listContentEntries, listExperience, listSkills, listAwards, listEducation, listSubscribers } from "@/lib/db";
import { getSettings } from "@/lib/settings";
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
  const settings = await getSettings();
  const newsletterOn = settings.features.newsletter;
  const guidesOn = settings.features.guides;

  const [contentTypes, experiences, skills, awards, education, subscribers] = await Promise.all([
    listContentTypes(),
    listExperience(),
    listSkills(),
    listAwards(),
    listEducation(),
    newsletterOn ? listSubscribers() : Promise.resolve([]),
  ]);

  // Load entries for each content type
  const entriesByType = await Promise.all(
    contentTypes.map(async (ct) => {
      // Skip post entries when newsletter is off, skip guide entries when guides are off
      if (ct.slug === "post" && !newsletterOn) return { type: ct, entries: [] };
      if (ct.slug === "guide" && !guidesOn) return { type: ct, entries: [] };
      const entries = await listContentEntries({ contentTypeId: ct.id });
      return { type: ct, entries };
    })
  );

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
          <div style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
            {summary}
          </div>
        </div>
      </div>

      {/* Content Types & Entries */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Content</h2>
        <Button as="a" href="/admin/content-types" size="sm" variant="outline">
          Manage types
        </Button>
      </div>
      {entriesByType.map(({ type, entries }) => (
        <div key={type.id} style={{ marginBottom: "var(--space-8)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              {type.icon && <span>{type.icon}</span>}
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>{type.name}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)" }}>{type.slug}</span>
            </div>
            <Button as="a" href={`/admin/content-entries/new?type=${type.slug}`} size="sm" variant="outline">
              + New
            </Button>
          </div>
          {entries.length === 0 ? (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No {type.name.toLowerCase()} entries yet.</p>
          ) : (
            <div>
              {entries.map((e, i) => (
                <div
                  key={e.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{e.title}</span>
                    <Badge status={e.status === "published" ? "published" : "draft"}>
                      {e.status === "published" ? "Published" : e.status === "scheduled" ? "Scheduled" : "Draft"}
                    </Badge>
                  </div>
                  <TextLink arrow="forward" muted href={`/admin/content-entries/${e.id}`} style={{ fontSize: "var(--text-xs)" }}>
                    Edit
                  </TextLink>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Experience */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Experience</h2>
        <Button as="a" href="/admin/experience/new" size="sm" variant="outline">+ New</Button>
      </div>
      {experiences.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>No experience entries yet.</p>
      ) : (
        <div style={{ marginBottom: "var(--space-8)" }}>
          {experiences.map((exp, i) => (
            <div key={exp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{exp.role}</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{exp.company}</span>
                {exp.current === 1 && <Badge status="published">Current</Badge>}
              </div>
              <TextLink arrow="forward" muted href={`/admin/experience/${exp.id}`} style={{ fontSize: "var(--text-xs)" }}>Edit</TextLink>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Skills</h2>
        <Button as="a" href="/admin/skills/new" size="sm" variant="outline">+ New</Button>
      </div>
      {skills.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>No skills yet.</p>
      ) : (
        <div style={{ marginBottom: "var(--space-8)" }}>
          {skills.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{s.name}</span>
                {s.category && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{s.category}</span>}
              </div>
              <TextLink arrow="forward" muted href={`/admin/skills/${s.id}`} style={{ fontSize: "var(--text-xs)" }}>Edit</TextLink>
            </div>
          ))}
        </div>
      )}

      {/* Awards */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Awards</h2>
        <Button as="a" href="/admin/awards/new" size="sm" variant="outline">+ New</Button>
      </div>
      {awards.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>No awards yet.</p>
      ) : (
        <div style={{ marginBottom: "var(--space-8)" }}>
          {awards.map((award, i) => (
            <div key={award.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{award.title}</span>
                {award.organization && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{award.organization}</span>}
              </div>
              <TextLink arrow="forward" muted href={`/admin/awards/${award.id}`} style={{ fontSize: "var(--text-xs)" }}>Edit</TextLink>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={sectionHead}>Education</h2>
        <Button as="a" href="/admin/education/new" size="sm" variant="outline">+ New</Button>
      </div>
      {education.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>No education entries yet.</p>
      ) : (
        <div style={{ marginBottom: "var(--space-8)" }}>
          {education.map((ed, i) => (
            <div key={ed.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{ed.school}</span>
                {ed.degree && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{ed.degree}</span>}
              </div>
              <TextLink arrow="forward" muted href={`/admin/education/${ed.id}`} style={{ fontSize: "var(--text-xs)" }}>Edit</TextLink>
            </div>
          ))}
        </div>
      )}

      {/* Subscribers */}
      {newsletterOn && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
            <h2 style={sectionHead}>Subscribers</h2>
            <Button as="a" href="/admin/subscribers" size="sm" variant="outline">Manage</Button>
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-8)" }}>
            {subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}
          </p>
        </>
      )}

      {/* Settings & SEO */}
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-8)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border)" }}>
        <Button as="a" href="/admin/settings" variant="outline" size="sm">Settings</Button>
        <Button as="a" href="/admin/seo" variant="outline" size="sm">SEO Templates</Button>
      </div>
    </div>
  );
}
