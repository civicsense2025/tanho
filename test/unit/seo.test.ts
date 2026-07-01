import { describe, it, expect } from "vitest";
import { buildMetadata, resolveTemplate, absoluteImage } from "@/lib/seo";
import type { SeoTemplate } from "@/lib/db/types";

const noOverrides = { seoTitle: null, seoDescription: null, ogImage: null, canonicalUrl: null, noIndex: 0 };

describe("resolveTemplate", () => {
  it("substitutes known {{vars}} and blanks unknown ones", () => {
    expect(resolveTemplate("{{title}} — {{brand}}", { title: "Hello", brand: "Acme" })).toBe("Hello — Acme");
    expect(resolveTemplate("{{title}} — {{missing}}", { title: "Hello" })).toBe("Hello — ");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(resolveTemplate("{{ title }}", { title: "X" })).toBe("X");
  });
});

describe("buildMetadata fallback chain", () => {
  it("prefers explicit override over template over base title", () => {
    const tpl: SeoTemplate = {
      id: "1", entityType: "project", titleTemplate: "{{title}} — Site",
      descriptionTemplate: "{{tagline}}", createdAt: "", updatedAt: "",
    };
    const withOverride = buildMetadata({ ...noOverrides, seoTitle: "Explicit" }, { title: "Base", tagline: "T" }, tpl);
    expect(withOverride.title).toBe("Explicit");

    const withTemplate = buildMetadata({ ...noOverrides }, { title: "Base", tagline: "T" }, tpl);
    expect(withTemplate.title).toBe("Base — Site");
    expect(withTemplate.description).toBe("T");

    const bareFallback = buildMetadata({ ...noOverrides }, { title: "Base", tagline: "T" });
    expect(bareFallback.title).toBe("Base");
    expect(bareFallback.description).toBe("T");
  });

  it("emits noindex robots only when noIndex is set", () => {
    expect(buildMetadata({ ...noOverrides, noIndex: 1 }, { title: "X" }).robots).toEqual({ index: false, follow: false });
    expect(buildMetadata({ ...noOverrides }, { title: "X" }).robots).toBeUndefined();
  });

  it("builds a canonical from path when no override is given", () => {
    const md = buildMetadata({ ...noOverrides }, { title: "X", path: "/projects/x" });
    expect(md.alternates?.canonical).toContain("/projects/x");
  });
});

describe("absoluteImage", () => {
  it("passes through absolute URLs and resolves relative ones", () => {
    expect(absoluteImage("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(absoluteImage("/uploads/a.png").endsWith("/uploads/a.png")).toBe(true);
    expect(absoluteImage("/uploads/a.png").startsWith("http")).toBe(true);
  });
});
