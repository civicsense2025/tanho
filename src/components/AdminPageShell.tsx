import type { ReactNode } from "react";
import { TextLink } from "@/components/ui";

/** Shared chrome for admin sub-pages: back link + page title, design widths.
 * `wide` opts a page out of the default prose-width constraint -- used by
 * the project editor's live-preview split pane, which needs real width. */
export function AdminPageShell({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <div style={{ maxWidth: wide ? "none" : "var(--width-prose)", margin: "0 auto", padding: "var(--space-8) var(--gutter)" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/admin" style={{ fontSize: "var(--text-xs)" }}>
          Admin
        </TextLink>
        <h1 style={{ margin: "var(--space-4) 0 0", fontSize: "var(--text-h2)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
