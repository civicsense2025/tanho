import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderCollection } from "./Render";
import type { CollectionContent } from "./fields";
import type { CollectionRecord } from "./resolve";
import type { RenderCtx, BlockNode } from "../types";
import { substituteRecordTokens } from "./bind";

// End-to-end for the repeater: the item template is rendered once per record with
// that record in context, and {{record.*}} tokens bind. We simulate the walker's
// ctx.children by substituting tokens + stringifying, which is exactly what
// RenderBlock does (substituteRecordTokens after validation) — so this proves the
// per-record repeat + binding contract without spinning up the async DB walker.
function fakeCtx(mode: "public" | "editor"): RenderCtx {
  return {
    mode,
    device: "desktop",
    viewer: null,
    children: (blocks: BlockNode[], opts?: { record?: Record<string, unknown> }) => {
      const bound = opts?.record
        ? blocks.map((b) => substituteRecordTokens(b, opts.record!))
        : blocks;
      return bound.map((b) => (b.content as { text?: string }).text ?? "").join("|");
    },
  };
}

const template: BlockNode[] = [
  { id: "t1", type: "heading", content: { text: "{{record.title}}" } },
];

function content(records: CollectionRecord[]): CollectionContent & { _resolved: CollectionRecord[] } {
  return {
    source: { kind: "entries", entity: "post" },
    limit: 6,
    blocks: template,
    _resolved: records,
  } as CollectionContent & { _resolved: CollectionRecord[] };
}

describe("RenderCollection", () => {
  it("repeats the template once per record, binding {{record.title}}", () => {
    const html = renderToStaticMarkup(
      RenderCollection({ content: content([{ title: "First" }, { title: "Second" }]), ctx: fakeCtx("public") }),
    );
    expect(html).toContain("First");
    expect(html).toContain("Second");
  });

  it("renders nothing on the public page when there are no records", () => {
    // Empty public collection returns null → no wrapper, no output.
    const html = renderToStaticMarkup(
      RenderCollection({ content: content([]), ctx: fakeCtx("public") }),
    );
    expect(html).toBe("");
  });

  it("editor mode renders the template ONCE against a sample record", () => {
    const html = renderToStaticMarkup(
      RenderCollection({ content: content([{ title: "Sample" }, { title: "Other" }]), ctx: fakeCtx("editor") }),
    );
    expect(html).toContain("Sample");
    expect(html).not.toContain("Other"); // only the first (sample) record is drawn
  });
});
