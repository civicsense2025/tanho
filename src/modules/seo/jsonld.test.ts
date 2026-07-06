import { describe, it, expect } from "vitest";
import { article, person, creativeWork, breadcrumb } from "./jsonld";

const CTX = { siteName: "Acme", siteUrl: "https://acme.test" };

describe("jsonld builders (activated in the render paths)", () => {
  describe("article() — posts and guides", () => {
    it("emits a valid schema.org Article with absolute url + publisher", () => {
      const ld = article(
        { title: "How to migrate", summary: "A concise guide.", url: "/guides/hosting/migrate" },
        CTX,
      );
      expect(ld["@context"]).toBe("https://schema.org");
      expect(ld["@type"]).toBe("Article");
      expect(ld.headline).toBe("How to migrate");
      expect(ld.description).toBe("A concise guide.");
      expect(ld.url).toBe("https://acme.test/guides/hosting/migrate");
      expect(ld.publisher).toEqual({ "@type": "Organization", name: "Acme" });
    });

    it("omits empty optional fields (no author, no description) rather than emitting blanks", () => {
      const ld = article({ title: "Bare", url: "/p" }, CTX);
      expect(ld).not.toHaveProperty("description");
      expect(ld).not.toHaveProperty("author");
      expect(ld.publisher).toBeDefined();
    });

    it("passes an author through when present", () => {
      const ld = article({ title: "T", url: "/p", authorName: "Jane" }, CTX);
      expect(ld.author).toEqual({ "@type": "Person", name: "Jane" });
    });
  });

  describe("creativeWork() — projects", () => {
    it("emits a valid schema.org CreativeWork from project data", () => {
      const ld = creativeWork(
        { title: "Portfolio Site", tagline: "A fast site", year: "2024", url: "/work/portfolio", tags: ["next", "css"] },
        CTX,
      );
      expect(ld["@context"]).toBe("https://schema.org");
      expect(ld["@type"]).toBe("CreativeWork");
      expect(ld.name).toBe("Portfolio Site");
      expect(ld.description).toBe("A fast site");
      expect(ld.dateCreated).toBe("2024");
      expect(ld.url).toBe("https://acme.test/work/portfolio");
      expect(ld.keywords).toBe("next, css");
      expect(ld.author).toEqual({ "@type": "Organization", name: "Acme" });
    });

    it("omits keywords/dateCreated when tags/year are empty", () => {
      const ld = creativeWork({ title: "T", url: "/work/t", tags: [] }, CTX);
      expect(ld).not.toHaveProperty("keywords");
      expect(ld).not.toHaveProperty("dateCreated");
    });
  });

  describe("person() — profile (builder ready; no public route wired yet)", () => {
    it("emits a valid schema.org Person", () => {
      const ld = person({ name: "Jane Doe", bio: "Builder", url: "/about", avatarUrl: "/api/media/x" }, CTX);
      expect(ld["@type"]).toBe("Person");
      expect(ld.name).toBe("Jane Doe");
      expect(ld.description).toBe("Builder");
      expect(ld.url).toBe("https://acme.test/about");
      expect(ld.image).toBe("https://acme.test/api/media/x");
    });
  });

  describe("breadcrumb()", () => {
    it("numbers the trail from 1 with absolute item urls", () => {
      const ld = breadcrumb(
        [
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Migrate", path: "/guides/hosting/migrate" },
        ],
        CTX,
      );
      expect(ld["@type"]).toBe("BreadcrumbList");
      expect(ld.itemListElement).toHaveLength(3);
      expect(ld.itemListElement[0]).toMatchObject({ position: 1, name: "Home", item: "https://acme.test/" });
      expect(ld.itemListElement[2].item).toBe("https://acme.test/guides/hosting/migrate");
    });
  });

  it("keeps external (http) urls absolute instead of re-prefixing the site", () => {
    const ld = article({ title: "T", url: "https://elsewhere.test/x" }, CTX);
    expect(ld.url).toBe("https://elsewhere.test/x");
  });
});
