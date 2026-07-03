import type { RenderCtx } from "../types";
import type { GenericDataResolved } from "../generic-data-resolve";
import type { TableContent } from "./fields";

/** Derives header/row string arrays either from resolved external rows or static content. */
function tableData(
  content: TableContent & { _resolved?: GenericDataResolved },
): { columns: string[]; rows: string[][] } {
  if (content.dataSource && content._resolved) {
    const columns = content.dataSource.columns;
    const rows = content._resolved.rows.map((row) => columns.map((c) => formatCell(row[c])));
    return { columns, rows };
  }
  return { columns: content.columns, rows: content.rows };
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Hairline table — mono uppercase header row on the surface tint. */
export function RenderTable({ content }: { content: TableContent; ctx: RenderCtx }) {
  const { columns, rows } = tableData(content);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
        <thead>
          <tr>
            {columns.map((heading, i) => (
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
          {rows.map((row, ri) => (
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
