import { listSkills } from "@/lib/db";
import { Tag } from "@/components/ui";
import { Eyebrow } from "./Eyebrow";

export async function SkillsListBlock({ heading = "Skills" }: { heading?: string }) {
  const skills = await listSkills();
  const skillsByCategory = skills.reduce((acc, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s.name);
    return acc;
  }, {} as Record<string, string[]>);

  if (Object.keys(skillsByCategory).length === 0) return null;

  return (
    <section style={{ marginBottom: "var(--space-12)" }}>
      <Eyebrow>{heading}</Eyebrow>
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
  );
}
