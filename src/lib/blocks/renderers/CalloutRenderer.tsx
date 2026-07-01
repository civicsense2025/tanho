import type { CalloutBlockContent } from "../types";
import { sanitizeHtml } from "@/lib/sanitize";

export function CalloutRenderer({ content }: { content: CalloutBlockContent }) {
  return (
    <div
      style={{
        padding: "var(--space-4)",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--text-sm)",
        color: "var(--text)",
        background: "var(--surface)",
        border: `1px solid ${content.variant === "danger" ? "var(--danger)" : content.variant === "warning" ? "var(--accent-2)" : "var(--border)"}`,
      }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html || "") }}
    />
  );
}
