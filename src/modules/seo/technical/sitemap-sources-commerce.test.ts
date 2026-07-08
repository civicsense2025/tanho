import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mocked dependencies ------------------------------------------------------
const getGeneralSettings = vi.fn();
const getSeoSettings = vi.fn();
const getCanonicalSiteUrl = vi.fn();
const getContentTypesSettings = vi.fn();
const listPublishedTypes = vi.fn();
const countPublishedRows = vi.fn();
const listPublishedRowsForSitemap = vi.fn();
const mediaPublicUrl = vi.fn();

const fixtures = {
  pageRows: [] as unknown[],
  entryRows: [] as unknown[],
  productRows: [] as unknown[],
  collectionRows: [] as unknown[],
  mediaRows: [] as unknown[],
  productCount: 0,
};

vi.mock("@/lib/db/client", () => ({
  db: {
    $count: () => Promise.resolve(fixtures.productCount),
    select: () => ({
      from: (table: { __table?: string }) => ({
        where: () => {
          const rows =
            table?.__table === "pages" ? fixtures.pageRows
              : table?.__table === "entries" ? fixtures.entryRows
                : table?.__table === "products" ? fixtures.productRows
                  : table?.__table === "collections" ? fixtures.collectionRows
                    : [];
          return Promise.resolve(rows);
        },
      }),
    }),
    query: {
      media: { findMany: () => Promise.resolve(fixtures.mediaRows) },
      products: {
        findMany: (opts?: { where?: unknown; limit?: number; offset?: number }) => {
          let rows = [...fixtures.productRows];
          if (opts?.where) {
            rows = rows.filter((r) => (r as { status?: string }).status === "active");
          }
          const offset = opts?.offset ?? 0;
          const limit = opts?.limit ?? rows.length;
          return Promise.resolve(rows.slice(offset, offset + limit));
        },
      },
      collections: { findMany: () => Promise.resolve(fixtures.collectionRows) },
    },
  },
}));
vi.mock("@/modules/pages/schema", () => ({ pages: { __table: "pages" } }));
vi.mock("@/modules/entries/schema", () => ({ entries: { __table: "entries" } }));
vi.mock("@/modules/commerce/schema", () => ({
  products: { __table: "products" },
  collections: { __table: "collections" },
}));
vi.mock("@/modules/fonts/queries", () => ({
  mediaPublicUrl: (...a: unknown[]) => mediaPublicUrl(...a),
}));

vi.mock("@/modules/settings/queries", () => ({
  getGeneralSettings: (...a: unknown[]) => getGeneralSettings(...a),
}));
vi.mock("@/modules/seo/queries", () => ({
  getSeoSettings: (...a: unknown[]) => getSeoSettings(...a),
}));
vi.mock("@/modules/domain/queries", () => ({
  getCanonicalSiteUrl: (...a: unknown[]) => getCanonicalSiteUrl(...a),
}));
vi.mock("@/modules/custom-types/content-types-settings", () => ({
  getContentTypesSettings: (...a: unknown[]) => getContentTypesSettings(...a),
  isTypeDisabled: (settings: { disabled: string[] }, key: string) => settings.disabled.includes(key),
}));
vi.mock("@/modules/content-schema/queries", () => ({
  listPublishedTypes: (...a: unknown[]) => listPublishedTypes(...a),
}));
vi.mock("@/modules/content-schema/crud", () => ({
  countPublishedRows: (...a: unknown[]) => countPublishedRows(...a),
  listPublishedRowsForSitemap: (...a: unknown[]) => listPublishedRowsForSitemap(...a),
}));
vi.mock("@/modules/entries/paths", () => ({
  entryPublicPath: () => null,
}));

import { buildSitemapForSection, listSitemapSections } from "./sitemap-sources";

beforeEach(() => {
  vi.clearAllMocks();
  fixtures.pageRows = [];
  fixtures.entryRows = [];
  fixtures.productRows = [];
  fixtures.collectionRows = [];
  fixtures.mediaRows = [];
  fixtures.productCount = 0;
  getGeneralSettings.mockResolvedValue({ indexable: true });
  getSeoSettings.mockResolvedValue({ siteUrl: "https://example.com" });
  getCanonicalSiteUrl.mockResolvedValue("https://example.com/");
  getContentTypesSettings.mockResolvedValue({ disabled: [] });
  listPublishedTypes.mockResolvedValue([]);
  countPublishedRows.mockResolvedValue(0);
  listPublishedRowsForSitemap.mockResolvedValue([]);
  mediaPublicUrl.mockImplementation((id: string) => `https://cdn.example.com/${id}.jpg`);
});

describe("listSitemapSections — shop", () => {
  it("adds shop sections after core when there are active products", async () => {
    fixtures.productCount = 5;
    const sections = await listSitemapSections(2);
    expect(sections).toEqual([
      { id: 0, kind: "core" },
      { id: 1, kind: "shop", chunk: 0 },
      { id: 2, kind: "shop", chunk: 1 },
      { id: 3, kind: "shop", chunk: 2 },
    ]);
  });
});

describe("buildSitemapForSection — core commerce coverage", () => {
  it("includes /shop and visible collections", async () => {
    fixtures.collectionRows = [
      { id: "c1", slug: "summer", name: "Summer", coverMediaId: null, visible: true, updatedAt: 1_700_000_000_000 },
      { id: "c2", slug: "hidden", name: "Hidden", coverMediaId: null, visible: false, updatedAt: 1_700_000_000_000 },
    ];
    const items = await buildSitemapForSection({ id: 0, kind: "core" }, "https://example.com");
    const urls = items.map((i) => i.url);

    expect(urls).toContain("https://example.com/shop");
    expect(urls).toContain("https://example.com/shop?collection=c1");
    expect(urls).not.toContain("https://example.com/shop?collection=c2");
  });
  it("emits image tags for page and collection images", async () => {
    fixtures.mediaRows = [
      { id: "media-about", storageKey: "about.jpg" },
      { id: "media-cover", storageKey: "cover.jpg" },
    ];
    fixtures.pageRows = [
      { route: "/about", title: "About", noIndex: false, updatedAt: new Date("2024-01-01"), ogImageMediaId: "media-about" },
    ];
    fixtures.collectionRows = [
      { id: "c1", slug: "summer", name: "Summer", coverMediaId: "media-cover", visible: true, updatedAt: 1_700_000_000_000 },
    ];
    const items = await buildSitemapForSection({ id: 0, kind: "core" }, "https://example.com");
    const about = items.find((i) => i.url === "https://example.com/about");
    const collection = items.find((i) => i.url === "https://example.com/shop?collection=c1");

    expect(about?.images).toEqual([{ loc: "https://cdn.example.com/media-about.jpg", title: "About", caption: "About" }]);
    expect(collection?.images).toEqual([{ loc: "https://cdn.example.com/media-cover.jpg", title: "Summer", caption: "Summer" }]);
  });
});

describe("buildSitemapForSection — shop", () => {
  it("includes active products and filters drafts", async () => {
    fixtures.productRows = [
      { id: "p1", slug: "widget", name: "Widget", status: "active", images: [], updatedAt: 1_700_000_000_000 },
      { id: "p2", slug: "gadget", name: "Gadget", status: "draft", images: [], updatedAt: 1_700_000_000_000 },
    ];
    const items = await buildSitemapForSection({ id: 1, kind: "shop", chunk: 0 }, "https://example.com");
    const urls = items.map((i) => i.url);

    expect(urls).toContain("https://example.com/shop/widget");
    expect(urls).not.toContain("https://example.com/shop/gadget");
  });
  it("pages the correct offset for a chunk", async () => {
    fixtures.productRows = [
      { id: "p1", slug: "a", name: "A", status: "active", images: [], updatedAt: 1 },
      { id: "p2", slug: "b", name: "B", status: "active", images: [], updatedAt: 1 },
      { id: "p3", slug: "c", name: "C", status: "active", images: [], updatedAt: 1 },
    ];
    const items = await buildSitemapForSection({ id: 1, kind: "shop", chunk: 1 }, "https://example.com", 2);
    expect(items.map((i) => i.url)).toEqual(["https://example.com/shop/c"]);
  });
  it("emits image tags for product images", async () => {
    fixtures.productRows = [
      { id: "p1", slug: "widget", name: "Widget", status: "active", images: ["/api/media/widget.jpg", "https://cdn.example.com/widget-2.jpg"], updatedAt: 1_700_000_000_000 },
    ];
    const items = await buildSitemapForSection({ id: 1, kind: "shop", chunk: 0 }, "https://example.com");
    const product = items.find((i) => i.url === "https://example.com/shop/widget");

    expect(product?.images).toEqual([
      { loc: "https://example.com/api/media/widget.jpg", title: "Widget", caption: "Widget" },
      { loc: "https://cdn.example.com/widget-2.jpg", title: "Widget", caption: "Widget" },
    ]);
  });
});
