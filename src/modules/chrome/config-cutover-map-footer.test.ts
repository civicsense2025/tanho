import { describe, expect, it } from "vitest";
import { mapOldFooterConfig, type OldFooterConfig } from "./config-cutover-map";

const baseFooter: OldFooterConfig = {
  layout: "simple-centered",
  logo: { text: "", style: "mark", icon: "", mediaId: null },
  columns: [],
  socialMenuId: "",
  newsletter: { enabled: false, title: "", body: "", cta: "" },
  copyright: "",
};

describe("mapOldFooterConfig — every recipe produces a real site-footer block", () => {
  const RECIPE_IDS = [
    "simple-centered",
    "multi-column",
    "cta-banner",
    "newsletter-forward",
    "mega-ecommerce",
    "two-column-brand",
    "sitemap-dense",
    "utility-minimal",
    "split-bar-thin",
    "statement-wordmark",
    "contact-forward",
    "legal-heavy",
    "map-location",
    "colored-block",
  ];

  for (const layout of RECIPE_IDS) {
    it(`"${layout}" produces exactly one valid site-footer root block`, () => {
      const { blocks } = mapOldFooterConfig({ ...baseFooter, layout }, null);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]!.type).toBe("site-footer");
    });
  }

  it("unrecognized layout falls back to columns and reports the issue, never throws", () => {
    const { blocks, issues } = mapOldFooterConfig({ ...baseFooter, layout: "not-a-real-recipe" }, null);
    expect(blocks).toHaveLength(1);
    expect((blocks[0]!.content as { layout: string }).layout).toBe("columns");
    expect(issues.some((i) => i.kind === "footer-recipe-unrecognized")).toBe(true);
  });

  it("dark recipes (utility-minimal, colored-block) set dark: true", () => {
    for (const layout of ["utility-minimal", "colored-block"]) {
      const { blocks } = mapOldFooterConfig({ ...baseFooter, layout }, null);
      expect((blocks[0]!.content as { dark: boolean }).dark).toBe(true);
    }
  });

  it("columns map 1:1 to footer-column blocks, in order, with title preserved", () => {
    const { blocks } = mapOldFooterConfig(
      { ...baseFooter, columns: [{ title: "Explore", menuId: "m1" }, { title: "Company", menuId: "m2" }] },
      null,
    );
    const kids = (blocks[0]!.content as { blocks: Array<{ type: string; content: Record<string, unknown> }> }).blocks;
    const cols = kids.filter((k) => k.type === "footer-column");
    expect(cols).toHaveLength(2);
    expect(cols[0]!.content).toMatchObject({ title: "Explore", menuId: "m1" });
    expect(cols[1]!.content).toMatchObject({ title: "Company", menuId: "m2" });
  });

  it("socialMenuId only adds a social-links block when non-empty", () => {
    const withSocial = mapOldFooterConfig({ ...baseFooter, socialMenuId: "social-menu" }, null);
    expect(
      (withSocial.blocks[0]!.content as { blocks: Array<{ type: string }> }).blocks.some((k) => k.type === "social-links"),
    ).toBe(true);

    const withoutSocial = mapOldFooterConfig(baseFooter, null);
    expect(
      (withoutSocial.blocks[0]!.content as { blocks: Array<{ type: string }> }).blocks.some((k) => k.type === "social-links"),
    ).toBe(false);
  });

  it("newsletter.enabled adds a REAL, functional newsletter block (compact variant) and reports it as a genuine activation, not a like-for-like port", () => {
    const { blocks, issues } = mapOldFooterConfig(
      { ...baseFooter, newsletter: { enabled: true, title: "Join us", body: "Stay updated", cta: "Sign up" } },
      null,
    );
    const kids = (blocks[0]!.content as { blocks: Array<{ type: string; content: Record<string, unknown> }> }).blocks;
    const nl = kids.find((k) => k.type === "newsletter");
    expect(nl).toBeTruthy();
    expect(nl!.content).toMatchObject({ variant: "compact", title: "Join us", body: "Stay updated", cta: "Sign up" });
    expect(issues.some((i) => i.kind === "footer-newsletter-activated")).toBe(true);
  });

  it("newsletter.enabled: false adds no newsletter block", () => {
    const { blocks } = mapOldFooterConfig(baseFooter, null);
    expect(
      (blocks[0]!.content as { blocks: Array<{ type: string }> }).blocks.some((k) => k.type === "newsletter"),
    ).toBe(false);
  });

  it("copyright override passes through verbatim; empty means the new block's own derived line takes over", () => {
    const withOverride = mapOldFooterConfig({ ...baseFooter, copyright: "© Custom Co, all rights reserved" }, null);
    expect((withOverride.blocks[0]!.content as { copyright: string }).copyright).toBe(
      "© Custom Co, all rights reserved",
    );

    const withoutOverride = mapOldFooterConfig(baseFooter, null);
    expect((withoutOverride.blocks[0]!.content as { copyright: string }).copyright).toBe("");
  });
});
