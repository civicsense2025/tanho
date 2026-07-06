import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderSearchTrigger } from "./Render";
import { searchTriggerSchema } from "./fields";
import type { RenderCtx } from "../types";

const ctx = { mode: "public", device: "desktop", viewer: null } as unknown as RenderCtx;

const render = (partial: Record<string, unknown>): string =>
  renderToStaticMarkup(<RenderSearchTrigger content={searchTriggerSchema.parse(partial)} ctx={ctx} />);

describe("search-trigger block", () => {
  it("renders a native GET form posting to /search", () => {
    const html = render({});
    expect(html).toContain("<form");
    expect(html).toContain('action="/search"');
    expect(html).toContain('method="get"');
  });

  it("the query input is named q — matches app/(public)/search/page.tsx's searchParams.q read", () => {
    const html = render({});
    expect(html).toContain('name="q"');
  });

  it("uses the author's placeholder and aria-label", () => {
    const html = render({ placeholder: "Find a guide…", ariaLabel: "Search our guides" });
    expect(html).toContain('placeholder="Find a guide…"');
    expect(html).toContain('aria-label="Search our guides"');
  });

  it("defaults to sensible placeholder/aria-label copy when unset", () => {
    const html = render({});
    expect(html).toContain('placeholder="Search…"');
    expect(html).toContain('aria-label="Search the site"');
  });
});
