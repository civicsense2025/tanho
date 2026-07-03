import type { RenderCtx } from "../types";
import type { TableContent } from "./fields";

/** Hairline table — mono uppercase header row on the surface tint. */
export function RenderTable({ content }: { content: TableContent; ctx: RenderCtx }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
        <thead>
          <tr>
            {content.columns.map((heading, i) => (
              <th
                key={i}
                style={{
                  textAlign: "left",
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--surface)",
                  borderBottom: "1px solid var(--border-strong)",
                  fontFamily: "var(--font-label)",
                  fontSize: "var(--text-2xs)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  letterSpacing: "var(--tracking-wide)",
                  color: "var(--text-muted)",
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--border)",
                    color: ci === 0 ? "var(--text)" : "var(--text-muted)",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
