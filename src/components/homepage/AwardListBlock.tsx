import { listAwards } from "@/lib/db";
import { Tag } from "@/components/ui";
import { Eyebrow } from "./Eyebrow";
import { Row } from "./Row";

export async function AwardListBlock({ heading = "Awards" }: { heading?: string }) {
  const awards = await listAwards();
  if (awards.length === 0) return null;

  return (
    <section style={{ marginBottom: "var(--space-12)" }}>
      <Eyebrow>{heading}</Eyebrow>
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
  );
}
