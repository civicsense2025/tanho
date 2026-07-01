import type { ChecklistBlockContent } from "../types";

export function ChecklistRenderer({ content }: { content: ChecklistBlockContent }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: "var(--text-sm)", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {(content.items || []).map((item, i) => (
        <li key={i}>☐ {item}</li>
      ))}
    </ul>
  );
}
