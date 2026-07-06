import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TableBackedType } from "@/modules/content-schema/queries";

// --- mocked dependencies ------------------------------------------------------
const getGeneralSettings = vi.fn();
const getSeoSettings = vi.fn();
const getCanonicalSiteUrl = vi.fn();
const getContentTypesSettings = vi.fn();
const listPublishedTypes = vi.fn();
const countPublishedRows = vi.fn();
const listPublishedRowsForSitemap = vi.fn();

// The core section reads pages + entries off the db client via
// db.select({...}).from(TABLE).where(...) — a thenable chain whose terminal
// (.where) resolves to the row array. Each mocked schema is a tagged sentinel
// so the db mock can route `from(table)` to the right row set. `_rows` holds
// the per-suite fixtures (var so it's hoisted alongside the mock factories).
var pageRows: unknown[] = [];
var entryRows: unknown[] = [];

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => ({
      from: (table: { __table?: string }) => ({
        where: () => Promise.resolve(table?.__table === "pages" ? pageRows : entryRows),
      }),
    }),
  },
}));
vi.mock("@/modules/pages/schema", () => ({ pages: { __table: "pages" } }));
vi.mock("@/modules/entries/schema", () => ({ entries: { __table: "entries" } }));

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
  // Real semantics: a type key is disabled when present in `disabled`.
  isTypeDisabled: (settings: { disabled: string[] }, key: string) =>
    settings.disabled.includes(key),
}));
vi.mock("@/modules/content-schema/queries", () => ({
  listPublishedTypes: (...a: unknown[]) => listPublishedTypes(...a),
}));
vi.mock("@/modules/content-schema/crud", () => ({
  countPublishedRows: (...a: unknown[]) => countPublishedRows(...a),
  listPublishedRowsForSitemap: (...a: unknown[]) => listPublishedRowsForSitemap(...a),
}));
// Entries use the shared path builder; keep the real one (pure).
vi.mock("@/modules/entries/paths", () => ({
  entryPublicPath: (type: string, slug: string) =>
    type === "project" ? `/work/${slug}` : null,
}));

import {
  buildSitemapForSection,
  getSitemapBase,
  listSitemapSections,
} from "./sitemap-sources";

// --- helpers ------------------------------------------------------------------
const makeType = (slug: string): TableBackedType =>
  ({
    id: `t-${slug}`,
    slug,
    basePath: `/${slug}`,
    tableName: `ct_${slug}`,
    status: "published",
    updatedAt: 1000,
  }) as unknown as TableBackedType;

beforeEach(() => {
  vi.clearAllMocks();
  pageRows = [];
  entryRows = [];
  getGeneralSettings.mockResolvedValue({ indexable: true });
  getSeoSettings.mockResolvedValue({ siteUrl: "https://example.com" });
  getCanonicalSiteUrl.mockResolvedValue("https://example.com/");
  getContentTypesSettings.mockResolvedValue({ disabled: [] });
  listPublishedTypes.mockResolvedValue([]);
  countPublishedRows.mockResolvedValue(0);
  listPublishedRowsForSitemap.mockResolvedValue([]);
});

describe("getSitemapBase", () => {
  it("returns the canonical url with the trailing slash stripped", async () => {
    expect(await getSitemapBase()).toBe("https://example.com");
  });
});

describe("listSitemapSections", () => {
  it("returns just the core section (id 0) when there are no published types", async () => {
    const sections = await listSitemapSections();
    expect(sections).toEqual([{ id: 0, kind: "core" }]);
  });

  it("orders type sections by slug ascending with sequential ids after core", async () => {
    // Registered out of slug order; each fits in a single chunk.
    listPublishedTypes.mockResolvedValue([makeType("zebra"), makeType("apple"), makeType("mango")]);
    countPublishedRows.mockResolvedValue(1);

    const sections = await listSitemapSections();
    expect(sections).toEqual([
      { id: 0, kind: "core" },
      { id: 1, kind: "type", typeSlug: "apple", chunk: 0 },
      { id: 2, kind: "type", typeSlug: "mango", chunk: 0 },
      { id: 3, kind: "type", typeSlug: "zebra", chunk: 0 },
    ]);
  });

  it("splits a type whose count exceeds the chunk size into consecutive chunks", async () => {
    listPublishedTypes.mockResolvedValue([makeType("posts")]);
    countPublishedRows.mockResolvedValue(5); // ceil(5 / 2) = 3 chunks

    const sections = await listSitemapSections(2);
    expect(sections).toEqual([
      { id: 0, kind: "core" },
      { id: 1, kind: "type", typeSlug: "posts", chunk: 0 },
      { id: 2, kind: "type", typeSlug: "posts", chunk: 1 },
      { id: 3, kind: "type", typeSlug: "posts", chunk: 2 },
    ]);
  });

  it("keeps ids sequential across multiple chunked types", async () => {
    listPublishedTypes.mockResolvedValue([makeType("a"), makeType("b")]);
    countPublishedRows.mockImplementation(async (table: string) => (table === "ct_a" ? 3 : 1));

    const sections = await listSitemapSections(2);
    expect(sections).toEqual([
      { id: 0, kind: "core" },
      { id: 1, kind: "type", typeSlug: "a", chunk: 0 }, // ceil(3/2)=2
      { id: 2, kind: "type", typeSlug: "a", chunk: 1 },
      { id: 3, kind: "type", typeSlug: "b", chunk: 0 }, // ceil(1/2)=1
    ]);
  });

  it("excludes disabled custom types", async () => {
    listPublishedTypes.mockResolvedValue([makeType("apple"), makeType("banana")]);
    countPublishedRows.mockResolvedValue(1);
    getContentTypesSettings.mockResolvedValue({ disabled: ["custom:banana"] });

    const sections = await listSitemapSections();
    expect(sections).toEqual([
      { id: 0, kind: "core" },
      { id: 1, kind: "type", typeSlug: "apple", chunk: 0 },
    ]);
  });

  it("returns only the core section when the site is non-indexable", async () => {
    getGeneralSettings.mockResolvedValue({ indexable: false });
    listPublishedTypes.mockResolvedValue([makeType("apple")]);
    countPublishedRows.mockResolvedValue(10);

    expect(await listSitemapSections()).toEqual([{ id: 0, kind: "core" }]);
  });
});

describe("buildSitemapForSection — core", () => {
  it("includes pages, entries, /resources and every published type's index url", async () => {
    pageRows = [
      { route: "/", noIndex: false, updatedAt: new Date("2024-01-01") },
      { route: "/about", noIndex: false, updatedAt: new Date("2024-01-02") },
      { route: "/secret", noIndex: true, updatedAt: new Date("2024-01-03") },
    ];
    entryRows = [
      { type: "project", slug: "alpha", data: {}, updatedAt: new Date("2024-02-01") },
      { type: "note", slug: "skip-me", data: {}, updatedAt: new Date("2024-02-02") },
    ];
    listPublishedTypes.mockResolvedValue([makeType("products")]);

    const items = await buildSitemapForSection({ id: 0, kind: "core" }, "https://example.com");
    const urls = items.map((i) => i.url);

    expect(urls).toContain("https://example.com/");
    expect(urls).toContain("https://example.com/about");
    expect(urls).not.toContain("https://example.com/secret"); // noIndex filtered
    expect(urls).toContain("https://example.com/work/alpha"); // project entry
    expect(urls).not.toContain("https://example.com/note/skip-me"); // no detail path
    expect(urls).toContain("https://example.com/resources");
    expect(urls).toContain("https://example.com/products"); // type index url
    // The home page carries priority 1.
    expect(items.find((i) => i.url === "https://example.com/")?.priority).toBe(1);
  });

  it("omits /resources when the resource type is disabled", async () => {
    getContentTypesSettings.mockResolvedValue({ disabled: ["resource"] });
    const items = await buildSitemapForSection({ id: 0, kind: "core" }, "https://example.com");
    expect(items.map((i) => i.url)).not.toContain("https://example.com/resources");
  });

  it("returns [] when the site is non-indexable", async () => {
    getGeneralSettings.mockResolvedValue({ indexable: false });
    pageRows = [{ route: "/", noIndex: false, updatedAt: new Date("2024-01-01") }];
    expect(await buildSitemapForSection({ id: 0, kind: "core" }, "https://example.com")).toEqual([]);
  });
});

describe("buildSitemapForSection — type", () => {
  it("emits base + row.path with lastModified from updated_at", async () => {
    listPublishedTypes.mockResolvedValue([makeType("posts")]);
    listPublishedRowsForSitemap.mockResolvedValue([
      { path: "/posts/hello", updated_at: 1_700_000_000_000 },
      { path: "/posts/world", updated_at: 1_700_000_500_000 },
    ]);

    const items = await buildSitemapForSection(
      { id: 1, kind: "type", typeSlug: "posts", chunk: 0 },
      "https://example.com",
    );
    expect(items).toEqual([
      {
        url: "https://example.com/posts/hello",
        lastModified: new Date(1_700_000_000_000),
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: "https://example.com/posts/world",
        lastModified: new Date(1_700_000_500_000),
        changeFrequency: "weekly",
        priority: 0.7,
      },
    ]);
  });

  it("pages the correct offset for a chunk", async () => {
    listPublishedTypes.mockResolvedValue([makeType("posts")]);
    listPublishedRowsForSitemap.mockResolvedValue([]);

    await buildSitemapForSection(
      { id: 3, kind: "type", typeSlug: "posts", chunk: 2 },
      "https://example.com",
      50,
    );
    expect(listPublishedRowsForSitemap).toHaveBeenCalledWith("ct_posts", { limit: 50, offset: 100 });
  });

  it("falls back to base/slug only when the path is empty", async () => {
    listPublishedTypes.mockResolvedValue([makeType("posts")]);
    listPublishedRowsForSitemap.mockResolvedValue([{ path: "", updated_at: null }]);

    const items = await buildSitemapForSection(
      { id: 1, kind: "type", typeSlug: "posts", chunk: 0 },
      "https://example.com",
    );
    // Empty path → base/slug fallback (slug derived from path is also empty here).
    expect(items[0]!.url).toBe("https://example.com/posts/");
  });

  it("returns [] when the type slug resolves to no published type", async () => {
    listPublishedTypes.mockResolvedValue([makeType("posts")]);
    const items = await buildSitemapForSection(
      { id: 9, kind: "type", typeSlug: "ghost", chunk: 0 },
      "https://example.com",
    );
    expect(items).toEqual([]);
    expect(listPublishedRowsForSitemap).not.toHaveBeenCalled();
  });
});
