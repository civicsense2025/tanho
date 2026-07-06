import type { RenderCtx } from "../types";
import type { StatementContent } from "./fields";

/** A large statement / manifesto line — bigger than a heading, quieter than a hero.
 *  Common on about/mission pages and between sections as a visual breath. */
export function RenderStatement({ content }: { content: StatementContent; ctx: RenderCtx }) {
  if (!content.text) return null;
  const fontSize = content.size === "xl" ? "var(--text-display)" : "var(--text-h1)";
  return (
    <div style={{ textAlign: content.align, maxWidth: "56rem", marginInline: content.align === "center" ? "auto" : undefined }}>
      <p
        style={{
          margin: 0,
          fontSize,
          lineHeight: "var(--leading-tight)",
          letterSpacing: "var(--tracking-tight)",
          fontWeight: "var(--weight-medium)" as never,
          color: "var(--text)",
          textWrap: "balance" as never,
        }}
      >
        {content.text}
      </p>
      {content.cite ? (
        <p style={{ margin: "var(--space-4) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {content.cite}
        </p>
      ) : null}
    </div>
  );
}
