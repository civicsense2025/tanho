import type { CSSProperties } from "react";
import type { RenderCtx } from "../types";
import type { CodeContent } from "./fields";

const LABEL: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-2xs)",
};

/**
 * Code snippet. The code is rendered as an ESCAPED React text node inside
 * <pre><code> — never innerHTML — so author code can't become markup.
 */
export function RenderCode({ content }: { content: CodeContent; ctx: RenderCtx }) {
  const { filename, language } = content;
  return (
    <div
      style={{
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {(filename || language) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            padding: "8px 14px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ ...LABEL, color: "var(--text-muted)" }}>{filename}</span>
          {language && (
            <span
              style={{
                ...LABEL,
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                color: "var(--text-faint)",
              }}
            >
              {language}
            </span>
          )}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: "var(--space-4)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          lineHeight: "var(--leading-normal)",
          color: "var(--text)",
          overflowX: "auto",
        }}
      >
        <code>{content.code}</code>
      </pre>
    </div>
  );
}
