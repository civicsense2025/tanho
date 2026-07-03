import type { RenderCtx } from "../types";
import type { QuoteContent } from "./fields";

/** Pull quote — accent left rule, display-size text, mono attribution. */
export function RenderQuote({ content }: { content: QuoteContent; ctx: RenderCtx }) {
  return (
    <blockquote
      style={{
        margin: 0,
        paddingLeft: "var(--space-5)",
        borderLeft: "2px solid var(--accent)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "var(--text-h2)",
          fontWeight: 500,
          letterSpacing: "var(--tracking-tight)",
          lineHeight: "var(--leading-snug)",
          color: "var(--text)",
        }}
      >
        {"“"}
        {content.text}
        {"”"}
      </p>
      {content.cite && (
        <cite
          style={{
            display: "block",
            marginTop: "var(--space-3)",
            fontStyle: "normal",
            fontFamily: "var(--font-label)",
            fontSize: "var(--text-2xs)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            color: "var(--text-faint)",
          }}
        >
          {"— "}
          {content.cite}
        </cite>
      )}
    </blockquote>
  );
}
