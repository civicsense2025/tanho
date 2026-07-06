import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderRelatedContent } from "./Render";
import { relatedContentSchema } from "./fields";
import type { RelatedItem } from "./resolve";
import type { RenderCtx } from "../types";

// related-content is a bound block: the walker overwrites `_resolved` with the
// resolver's output, so we exercise the pure Render directly with injected
// data (the resolver's DB logic is covered separately/at integration).
const ITEMS: RelatedItem[] = [
  { title: "Alpha", subtitle: "First project", href: "/work/alpha" },
  { title: "Beta", subtitle: "", href: "/work/beta" },
];

const ctx = { mode: "public", device: "desktop", viewer: null } as unknown as RenderCtx;

function render(partial: Record<string, unknown>, resolved: RelatedItem[] | null): string {
  const content = { ...relatedContentSchema.parse(partial), _resolved: resolved };
  return renderToStaticMarkup(<RenderRelatedContent content={content} ctx={ctx} />);
}

describe("related-content block", () => {
  it("renders a labelled section with crawlable card links", () => {
    const html = render({ title: "Related" }, ITEMS);
    expect(html).toContain("<section");
    expect(html).toContain('href="/work/alpha"');
    expect(html).toContain('href="/work/beta"');
    expect(html).toContain("Alpha");
    expect(html).toContain("First project");
  });

  it("uses aria-labelledby with a real heading when titled", () => {
    const html = render({ title: "More work" }, ITEMS);
    expect(html).toContain('id="related-heading"');
    expect(html).toContain('aria-labelledby="related-heading"');
    expect(html).toContain("More work");
  });

  it("sets the column count custom property", () => {
    const html = render({ cols: 2 }, ITEMS);
    expect(html).toContain("--rc-cols:2");
  });

  it("renders the title at the configured heading level (default h2)", () => {
    expect(render({ title: "Related" }, ITEMS)).toContain("<h2");
    const h3 = render({ title: "Related", headingLevel: "h3" }, ITEMS);
    expect(h3).toContain("<h3");
    expect(h3).not.toContain("<h2");
  });

  it("renders nothing when the resolver returned no items", () => {
    expect(render({}, [])).toBe("");
    expect(render({}, null)).toBe("");
  });

  it("renders a card with only a title when the subtitle is empty", () => {
    const html = render({}, [{ title: "Solo", subtitle: "", href: "/work/solo" }]);
    expect(html).toContain("Solo");
    expect(html).toContain('href="/work/solo"');
    const spanCount = (html.match(/<span/g) ?? []).length;
    expect(spanCount).toBe(1);
  });
});
