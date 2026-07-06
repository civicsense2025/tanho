import { describe, expect, it } from "vitest";
import { mapOldHeaderConfig, type OldHeaderConfig } from "./config-cutover-map";

const baseHeader: OldHeaderConfig = {
  layout: "center-cta",
  logo: { text: "", style: "mark", icon: "", mediaId: null },
  menuId: "menu-1",
  cta: { enabled: true, label: "Get started", href: "/signup", variant: "solid" },
  sticky: true,
  transparentOnHero: false,
  mobile: { style: "drawer-right" },
};

describe("mapOldHeaderConfig — every recipe produces a real site-header block", () => {
  const RECIPE_IDS = [
    "center-cta",
    "left-nav",
    "split-center-logo",
    "minimal-right",
    "icon-only",
    "stacked-centered",
    "search-forward",
    "ecommerce-icons",
    "overlay-transparent",
    "sidebar-vertical",
    "split-luxury",
    "pill-nav",
    "underline-minimal",
    "utility-two-tier",
    "app-tabs",
    "editorial-statement",
  ];

  for (const layout of RECIPE_IDS) {
    it(`"${layout}" produces exactly one valid site-header root block`, () => {
      const { blocks } = mapOldHeaderConfig({ ...baseHeader, layout }, null);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]!.type).toBe("site-header");
    });
  }

  it("unrecognized layout falls back to spread/plain and reports the issue, never throws", () => {
    const { blocks, issues } = mapOldHeaderConfig({ ...baseHeader, layout: "not-a-real-recipe" }, null);
    expect(blocks).toHaveLength(1);
    const content = blocks[0]!.content as { layout: string };
    expect(content.layout).toBe("spread");
    expect(issues.some((i) => i.kind === "header-recipe-unrecognized")).toBe(true);
  });

  it("split-center-logo / split-luxury use TWO nav-menu blocks with first-half/second-half slice, logo between them", () => {
    // CTA disabled here — its placement (always appended last) is covered by
    // its own dedicated test below; this test isolates the split-nav trio.
    const noCta = { ...baseHeader, cta: { ...baseHeader.cta, enabled: false } };
    for (const layout of ["split-center-logo", "split-luxury"]) {
      const { blocks, issues } = mapOldHeaderConfig({ ...noCta, layout }, null);
      const kids = (blocks[0]!.content as { blocks: Array<{ type: string; content: Record<string, unknown> }> })
        .blocks;
      expect(kids.map((k) => k.type)).toEqual(["nav-menu", "logo", "nav-menu"]);
      expect(kids[0]!.content.slice).toBe("first-half");
      expect(kids[2]!.content.slice).toBe("second-half");
      expect(issues.some((i) => i.kind === "header-split-nav-migrated")).toBe(true);
    }
  });

  it("sidebar-vertical maps to layout: sidebar + a vertical nav-menu", () => {
    const { blocks } = mapOldHeaderConfig({ ...baseHeader, layout: "sidebar-vertical" }, null);
    const content = blocks[0]!.content as { layout: string; blocks: Array<{ type: string; content: Record<string, unknown> }> };
    expect(content.layout).toBe("sidebar");
    const nav = content.blocks.find((k) => k.type === "nav-menu");
    expect(nav!.content.variant).toBe("vertical");
  });

  it("utility-two-tier sets twoTier: true on the site-header", () => {
    const { blocks } = mapOldHeaderConfig({ ...baseHeader, layout: "utility-two-tier" }, null);
    expect((blocks[0]!.content as { twoTier: boolean }).twoTier).toBe(true);
  });

  it("icon-only (navPos: hidden) has no nav-menu child and reports it", () => {
    const { blocks, issues } = mapOldHeaderConfig({ ...baseHeader, layout: "icon-only" }, null);
    const kids = (blocks[0]!.content as { blocks: Array<{ type: string }> }).blocks;
    expect(kids.some((k) => k.type === "nav-menu")).toBe(false);
    expect(issues.some((i) => i.kind === "header-nav-hidden")).toBe(true);
  });

  it("overlay-transparent sets transparentOnHero true even if the old row's own flag was false", () => {
    const { blocks } = mapOldHeaderConfig(
      { ...baseHeader, layout: "overlay-transparent", transparentOnHero: false },
      null,
    );
    expect((blocks[0]!.content as { transparentOnHero: boolean }).transparentOnHero).toBe(true);
  });

  it("editorial-statement sets the logo's big flag (old logoPos: centerBig)", () => {
    const { blocks } = mapOldHeaderConfig({ ...baseHeader, layout: "editorial-statement" }, null);
    const logo = (blocks[0]!.content as { blocks: Array<{ type: string; content: Record<string, unknown> }> }).blocks.find(
      (k) => k.type === "logo",
    );
    expect(logo!.content.big).toBe(true);
  });

  it("decorative-only dimensions (search, icons, avatar) are reported but never block a real header from being produced", () => {
    for (const layout of ["search-forward", "ecommerce-icons", "app-tabs"]) {
      const { blocks, issues } = mapOldHeaderConfig({ ...baseHeader, layout }, null);
      expect(blocks).toHaveLength(1);
      expect(issues.some((i) => i.kind === "header-decorative-dropped")).toBe(true);
    }
  });

  it("cta only added when enabled + label + href are all present", () => {
    const withCta = mapOldHeaderConfig(baseHeader, null);
    const kidsWith = (withCta.blocks[0]!.content as { blocks: Array<{ type: string }> }).blocks;
    expect(kidsWith.some((k) => k.type === "cta-button")).toBe(true);

    const withoutCta = mapOldHeaderConfig({ ...baseHeader, cta: { ...baseHeader.cta, enabled: false } }, null);
    const kidsWithout = (withoutCta.blocks[0]!.content as { blocks: Array<{ type: string }> }).blocks;
    expect(kidsWithout.some((k) => k.type === "cta-button")).toBe(false);
  });

  it("logo with old style 'image' + a resolved src maps to the new src field, style falls back to mark (no 'image' style exists anymore)", () => {
    const { blocks } = mapOldHeaderConfig(
      { ...baseHeader, logo: { text: "Acme", style: "image", icon: "", mediaId: "media-1" } },
      "/api/media/logo.png",
    );
    const logo = (blocks[0]!.content as { blocks: Array<{ type: string; content: Record<string, unknown> }> }).blocks.find(
      (k) => k.type === "logo",
    );
    expect(logo!.content.style).toBe("mark");
    expect(logo!.content.src).toBe("/api/media/logo.png");
  });

  it("logo with old style 'image' but NO resolved src (broken/deleted media row) falls back cleanly, no crash", () => {
    const { blocks } = mapOldHeaderConfig(
      { ...baseHeader, logo: { text: "Acme", style: "image", icon: "", mediaId: "media-1" } },
      null,
    );
    const logo = (blocks[0]!.content as { blocks: Array<{ type: string; content: Record<string, unknown> }> }).blocks.find(
      (k) => k.type === "logo",
    );
    expect(logo!.content.style).toBe("mark");
    expect(logo!.content.src).toBe("");
  });

  it("a non-image logo style is never given a src value", () => {
    const { blocks } = mapOldHeaderConfig(
      { ...baseHeader, logo: { text: "", style: "wordmark", icon: "", mediaId: null } },
      "/some/unrelated/url.png", // even if a caller mistakenly resolved something, wrong style must not carry it
    );
    const logo = (blocks[0]!.content as { blocks: Array<{ type: string; content: Record<string, unknown> }> }).blocks.find(
      (k) => k.type === "logo",
    );
    expect(logo!.content.style).toBe("wordmark");
    expect(logo!.content.src).toBe("");
  });
});
