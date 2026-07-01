import { getExperience } from "@/lib/content/source";
import { Eyebrow } from "./Eyebrow";
import { Row } from "./Row";

export async function ExperienceListBlock({ heading = "Experience" }: { heading?: string }) {
  const experiences = await getExperience();
  if (experiences.length === 0) return null;

  return (
    <section style={{ marginBottom: "var(--space-12)" }}>
      <Eyebrow>{heading}</Eyebrow>
      {experiences.map((e, i) => (
        <Row key={e.id} span={`${e.startDate ?? ""}${e.startDate ? " — " : ""}${e.current ? "Present" : e.endDate ?? ""}`} last={i === experiences.length - 1}>
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
  );
}
