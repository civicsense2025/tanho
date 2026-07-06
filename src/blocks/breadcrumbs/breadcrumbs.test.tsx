import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderBlock } from "../renderer/BlockRenderer";
import type { BlockNode, PageCtx } from "../types";

const PAGE: PageCtx = {
  title: "Deep Page",
  route: "/guides/setup/deep",
  ancestors: [
    { title: "Guides", route: "/guides" },
    { title: "Setup", route: "/guides/setup" },
  ],
  siteName: "Acme",
  siteUrl: "https://acme.test",
};

async function render(
  content: Record<string, unknown>,
  opts: { page?: PageCtx; mode?: "public" | "editor"; withPage?: boolean } = {},
): Promise<string> {
  const { mode = "public", withPage = true } = opts;
  const page = withPage ? opts.page ?? PAGE : undefined;
  const block: BlockNode = { id: "bc", type: "breadcrumbs", content };
  const el = await RenderBlock({ block, device: "desktop", mode, viewer: null, page });
  return renderToStaticMarkup(el);
}

describe("breadcrumbs block", () => {
  it("renders a Breadcrumb nav landmark with the ancestor trail", async () => {
    const html = await render({});
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/"'); // home
    expect(html).toContain('href="/guides"');
    expect(html).toContain('href="/guides/setup"');
    expect(html).toContain("Guides");
    expect(html).toContain("Setup");
  });

  it("marks the current page with aria-current and no link", async () => {
    const html = await render({});
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Deep Page");
    // current page is not a link
    expect(html).not.toContain('href="/guides/setup/deep"');
  });

  it("emits BreadcrumbList JSON-LD with absolute item URLs", async () => {
    const html = await render({});
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"https://acme.test/guides"');
    // position ordering present
    expect(html).toContain('"position":1');
  });

  it("can hide the home crumb", async () => {
    const html = await render({ showHome: false });
    expect(html).not.toContain('href="/"');
    expect(html).toContain('href="/guides"');
  });

  it("shows an editor placeholder without page context", async () => {
    const html = await render({}, { withPage: false, mode: "editor" });
    expect(html.toLowerCase()).toContain("breadcrumbs");
    expect(html).not.toContain("<nav");
  });

  it("renders nothing on the public site without page context", async () => {
    const html = await render({}, { withPage: false, mode: "public" });
    expect(html).not.toContain("<nav");
  });

  it("suppresses a one-crumb trail (lone Home on a root page)", async () => {
    const rootPage = { ...PAGE, ancestors: [] };
    const html = await render({ showCurrent: false }, { page: rootPage });
    expect(html).not.toContain("<nav");
    expect(html).not.toContain("ld+json");
  });

  it("still renders Home → Current on a root page (two crumbs)", async () => {
    const rootPage = { ...PAGE, ancestors: [] };
    const html = await render({}, { page: rootPage });
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-current="page"');
  });
});
