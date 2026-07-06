import { beforeEach, describe, expect, it, vi } from "vitest";

const getGeneralSettings = vi.fn();
const getSeoSettings = vi.fn();
const mediaPublicUrl = vi.fn();

vi.mock("@/modules/settings/queries", () => ({
  getGeneralSettings: () => getGeneralSettings(),
}));
vi.mock("../queries", () => ({
  getSeoSettings: () => getSeoSettings(),
}));
vi.mock("@/modules/fonts/queries", () => ({
  mediaPublicUrl: (id: string | null) => mediaPublicUrl(id),
}));

import { buildPageMetadata } from "./build";
import { DYNAMIC_OG_PATH } from "./og-image";

const GENERAL = { name: "Acme", tagline: "We do things", language: "en", indexable: true };
const SEO = {
  siteUrl: "https://acme.test",
  defaultOgMediaId: null,
  sitemapEnabled: true,
  templates: {
    page: { title: "{title} · {site}", description: "{excerpt}" },
    post: { title: "{title} — {site}", description: "{excerpt}" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  getGeneralSettings.mockResolvedValue(GENERAL);
  getSeoSettings.mockResolvedValue(SEO);
  mediaPublicUrl.mockResolvedValue(null);
});

describe("buildPageMetadata", () => {
  it("templates the title/description and sets a relative canonical", async () => {
    const md = await buildPageMetadata({
      contentType: "page",
      title: "About",
      excerpt: "Who we are",
      path: "/about",
    });
    expect(md.title).toEqual({ absolute: "About · Acme" });
    expect(md.description).toBe("Who we are");
    expect(md.alternates?.canonical).toBe("/about");
  });

  it("builds a complete openGraph + twitter card", async () => {
    const md = await buildPageMetadata({
      contentType: "page",
      title: "About",
      excerpt: "Who we are",
      path: "/about",
    });
    expect(md.openGraph).toMatchObject({
      title: "About · Acme",
      description: "Who we are",
      url: "/about",
      siteName: "Acme",
      locale: "en_US",
      type: "website",
    });
    expect(md.twitter).toMatchObject({ card: "summary_large_image", title: "About · Acme" });
  });

  it("falls back to the generated OG route (encoding the title) when no image resolves", async () => {
    const md = await buildPageMetadata({ contentType: "page", title: "About", path: "/about" });
    const images = md.openGraph?.images as Array<{ url: string }>;
    expect(images[0].url).toContain(DYNAMIC_OG_PATH);
    expect(images[0].url).toContain("title=About");
  });

  it("uses an uploaded per-page image over the generated fallback", async () => {
    mediaPublicUrl.mockResolvedValue("https://cdn.test/og-123.png");
    const md = await buildPageMetadata({
      contentType: "page",
      title: "About",
      path: "/about",
      ogImageMediaId: "media-123",
    });
    const images = md.openGraph?.images as Array<{ url: string }>;
    expect(images[0].url).toBe("https://cdn.test/og-123.png");
    expect(mediaPublicUrl).toHaveBeenCalledWith("media-123");
  });

  it("prefers a direct ogImageUrl over any media id (product images)", async () => {
    const md = await buildPageMetadata({
      contentType: "page",
      title: "Widget",
      path: "/shop/widget",
      ogImageUrl: "https://cdn.test/widget.jpg",
      ogImageMediaId: "should-be-ignored",
    });
    const images = md.openGraph?.images as Array<{ url: string }>;
    expect(images[0].url).toBe("https://cdn.test/widget.jpg");
    expect(mediaPublicUrl).not.toHaveBeenCalled();
  });

  it("emits article og:type + timestamps for posts", async () => {
    const md = await buildPageMetadata({
      contentType: "post",
      title: "News",
      path: "/news/hello",
      kind: "article",
      publishedTime: "2026-01-01T00:00:00.000Z",
    });
    expect(md.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-01-01T00:00:00.000Z",
    });
  });

  it("honors an explicit canonical override", async () => {
    const md = await buildPageMetadata({
      contentType: "page",
      title: "Dup",
      path: "/dup",
      canonicalOverride: "https://acme.test/original",
    });
    expect(md.alternates?.canonical).toBe("https://acme.test/original");
    expect(md.openGraph?.url).toBe("https://acme.test/original");
  });

  it("sets noindex robots when the page is noIndex", async () => {
    const md = await buildPageMetadata({ contentType: "page", title: "Hidden", path: "/x", noIndex: true });
    expect(md.robots).toEqual({ index: false, follow: false });
  });

  it("sets noindex robots site-wide when the site is not indexable", async () => {
    getGeneralSettings.mockResolvedValue({ ...GENERAL, indexable: false });
    const md = await buildPageMetadata({ contentType: "page", title: "Any", path: "/y" });
    expect(md.robots).toEqual({ index: false, follow: false });
  });

  it("falls back to the site tagline when no description is produced", async () => {
    const md = await buildPageMetadata({ contentType: "page", title: "NoDesc", path: "/z" });
    expect(md.description).toBe("We do things");
  });

  it("maps a bare language code to a full OG locale", async () => {
    getGeneralSettings.mockResolvedValue({ ...GENERAL, language: "fr" });
    const md = await buildPageMetadata({ contentType: "page", title: "Bonjour", path: "/fr" });
    expect(md.openGraph?.locale).toBe("fr_FR");
  });
});
