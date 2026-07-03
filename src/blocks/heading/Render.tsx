import type { RenderCtx } from "../types";
import type { HeadingContent } from "./fields";

const SIZE: Record<string, string> = {
  h1: "var(--text-h1)",
  h2: "var(--text-h2)",
  h3: "var(--text-lg)",
  h4: "var(--text-body)",
};

export function RenderHeading({ content }: { content: HeadingContent; ctx: RenderCtx }) {
  const Tag = content.level;
  return (
    <Tag
      style={{
        margin: 0,
        fontSize: SIZE[content.level],
        fontWeight: "var(--weight-medium)" as never,
        letterSpacing: "var(--tracking-tight)",
        color: "var(--text)",
        textAlign: content.align,
      }}
    >
      {content.text}
    </Tag>
  );
}
