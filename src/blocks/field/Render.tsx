import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { FieldBlockContent, FieldResolved } from "./fields";

const SIZE: Record<string, string> = {
  h1: "var(--text-h1)",
  h2: "var(--text-h2)",
  h3: "var(--text-lg)",
  h4: "var(--text-body)",
};

/**
 * Renders one content-type field from the current row. The detail-render path
 * attaches `{ value, label }` as `content._resolved`; in the editor a bound
 * placeholder shows until it's resolved (mirrors postlist/table). The value is
 * plain text (already escaped by the row templater) — never HTML.
 */
export function RenderField({
  content,
  ctx,
}: {
  content: FieldBlockContent & { _resolved?: FieldResolved };
  ctx: RenderCtx;
}) {
  const resolved = content._resolved;
  const ph = boundPlaceholder(ctx, content.field ? `Field · ${content.field}` : "Field", resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  // Resolved but empty value (row has no data for this field) → render nothing
  // on the public page rather than an empty shell.
  const value = resolved?.value ?? "";
  if (!value) return null;
  const text = `${content.prefix}${value}${content.suffix}`;
  const label = content.label || resolved?.label || "";

  if (content.display === "heading") {
    const Tag = content.level;
    return (
      <Tag
        style={{
          margin: 0,
          fontSize: SIZE[content.level],
          fontWeight: "var(--weight-medium)" as never,
          letterSpacing: "var(--tracking-tight)",
          color: "var(--text)",
        }}
      >
        {text}
      </Tag>
    );
  }

  if (content.display === "label-value") {
    return (
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "baseline" }}>
        {label ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              color: "var(--text-faint)",
            }}
          >
            {label}
          </span>
        ) : null}
        <span style={{ fontSize: "var(--text-body)", color: "var(--text)" }}>{text}</span>
      </div>
    );
  }

  // "auto" / "text"
  return <p style={{ margin: 0, fontSize: "var(--text-body)", color: "var(--text)" }}>{text}</p>;
}
