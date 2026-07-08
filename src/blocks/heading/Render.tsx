import type { FormEvent, PointerEvent } from "react";
import { slugify } from "@/lib/slug";
import type { RenderCtx } from "../types";
import type { HeadingContent } from "./fields";

const SIZE: Record<string, string> = {
  h1: "var(--text-h1)",
  h2: "var(--text-h2)",
  h3: "var(--text-lg)",
  h4: "var(--text-body)",
  h5: "var(--text-sm)",
  h6: "var(--text-xs)",
};

export function RenderHeading({ content, ctx }: { content: HeadingContent; ctx: RenderCtx }) {
  const Tag = content.level;
  // A stable anchor id so the table-of-contents block (and any #hash link) can
  // target this heading. `_anchorId` is the page-unique, deduped id injected by
  // the walker from the precomputed outline (so two same-text headings differ);
  // a bare slug is the fallback for standalone/editor renders. scroll-margin-top
  // offsets the landing position below a sticky header (0 if none published).
  const injected = (content as { _anchorId?: string })._anchorId;
  const id = injected || slugify(content.text) || undefined;
  const editable = ctx.mode === "editor" && !!ctx.onChange;
  // Event handlers can only appear in JSX when a Client Component renders them.
  // In public mode RenderBlock is a Server Component, so the handlers must be
  // absent from the element entirely (not just no-ops) or Next.js rejects them.
  const editProps = editable
    ? {
      contentEditable: true,
      suppressContentEditableWarning: true,
      onPointerDown: (e: PointerEvent) => e.stopPropagation(),
      onInput: (e: FormEvent<HTMLElement>) =>
        ctx.onChange?.({ text: e.currentTarget.textContent ?? "" }),
    }
    : {};
  return (
    <Tag
      id={id}
      {...editProps}
      style={{
        margin: 0,
        fontSize: SIZE[content.level],
        fontWeight: "var(--weight-medium)" as never,
        letterSpacing: "var(--tracking-tight)",
        color: "var(--text)",
        textAlign: content.align,
        scrollMarginTop: "var(--header-height, 0px)",
        outline: editable ? "none" : undefined,
      }}
    >
      {content.text}
    </Tag>
  );
}
