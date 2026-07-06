import { slugify } from "@/lib/slug";
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
  // A stable anchor id so the table-of-contents block (and any #hash link) can
  // target this heading. `_anchorId` is the page-unique, deduped id injected by
  // the walker from the precomputed outline (so two same-text headings differ);
  // a bare slug is the fallback for standalone/editor renders. scroll-margin-top
  // offsets the landing position below a sticky header (0 if none published).
  const injected = (content as { _anchorId?: string })._anchorId;
  const id = injected || slugify(content.text) || undefined;
  return (
    <Tag
      id={id}
      style={{
        margin: 0,
        fontSize: SIZE[content.level],
        fontWeight: "var(--weight-medium)" as never,
        letterSpacing: "var(--tracking-tight)",
        color: "var(--text)",
        textAlign: content.align,
        scrollMarginTop: "var(--header-height, 0px)",
      }}
    >
      {content.text}
    </Tag>
  );
}
