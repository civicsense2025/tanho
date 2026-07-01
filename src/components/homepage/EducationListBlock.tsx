import { listEducation } from "@/lib/db";
import { Eyebrow } from "./Eyebrow";
import { Row } from "./Row";

export async function EducationListBlock({ heading = "Education" }: { heading?: string }) {
  const education = await listEducation();
  if (education.length === 0) return null;

  return (
    <section>
      <Eyebrow>{heading}</Eyebrow>
      {education.map((ed, i) => (
        <Row key={ed.id} span={ed.span ?? ""} last={i === education.length - 1}>
          <div style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)" }}>{ed.school}</div>
          {ed.degree && <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{ed.degree}</p>}
        </Row>
      ))}
    </section>
  );
}
