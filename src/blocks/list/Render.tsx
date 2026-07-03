import type { RenderCtx } from "../types";
import type { ListContent } from "./fields";

const ITEM_TYPE = {
  fontSize: "var(--text-body)",
  color: "var(--text-muted)",
  lineHeight: "var(--leading-normal)",
} as const;

/** Bullet / numbered / check list. Check style leads with a ✓ glyph. */
export function RenderList({ content }: { content: ListContent; ctx: RenderCtx }) {
  if (content.style === "check") {
    return (
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {content.items.map((item, i) => (
          <li key={i} style={{ ...ITEM_TYPE, display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
            <span aria-hidden style={{ color: "var(--accent-2)", fontWeight: 500, flexShrink: 0 }}>
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  const Tag = content.style === "number" ? "ol" : "ul";
  return (
    <Tag
      style={{
        ...ITEM_TYPE,
        margin: 0,
        paddingLeft: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      {content.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  );
}
