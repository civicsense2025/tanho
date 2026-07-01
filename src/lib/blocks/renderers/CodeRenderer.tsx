import type { CodeBlockContent } from "../types";

export function CodeRenderer({ content }: { content: CodeBlockContent }) {
  return (
    <div style={{ borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
      {content.filename && (
        <div style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-xs)", background: "var(--surface)", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
          {content.filename}
        </div>
      )}
      <pre style={{ margin: 0, padding: "var(--space-4)", overflowX: "auto", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", background: "var(--surface)", color: "var(--text)" }}>
        <code>{content.code}</code>
      </pre>
    </div>
  );
}
