import { describe, it, expect } from "vitest";
import { organization, webSite } from "./site";
import { product, event, faqPage, availabilityUrl } from "./builders";

const CTX = { siteName: "Acme", siteUrl: "https://acme.test" };

describe("site-level structured data", () => {
  it("organization carries name + url, omits empty logo/sameAs", () => {
    const ld = organization(CTX);
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("Acme");
    expect(ld.url).toBe("https://acme.test");
    expect(ld).not.toHaveProperty("logo");
    expect(ld).not.toHaveProperty("sameAs");
  });

  it("organization includes logo + sameAs when provided", () => {
    const ld = organization(CTX, { logoUrl: "https://cdn.test/logo.png", sameAs: ["https://x.com/acme", ""] });
    expect(ld.logo).toBe("https://cdn.test/logo.png");
    expect(ld.sameAs).toEqual(["https://x.com/acme"]); // empty string filtered
  });

  it("webSite emits a SearchAction pointing at /search?q=", () => {
    const ld = webSite(CTX);
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.potentialAction["@type"]).toBe("SearchAction");
    expect(ld.potentialAction.target.urlTemplate).toBe("https://acme.test/search?q={search_term_string}");
    expect(ld.potentialAction["query-input"]).toBe("required name=search_term_string");
  });
});

describe("product / event / faq builders", () => {
  it("product mirrors the previous inline schema (absolute images + offer)", () => {
    const ld = product(
      { name: "Widget", url: "/shop/widget", images: ["/img/a.jpg"], sku: "W1", priceCents: 2500, currency: "usd", inStock: true },
      CTX,
    );
    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe("Widget");
    expect(ld.image).toEqual(["https://acme.test/img/a.jpg"]);
    expect(ld.sku).toBe("W1");
    expect(ld.brand).toEqual({ "@type": "Brand", name: "Acme" });
    expect(ld.offers).toMatchObject({
      url: "https://acme.test/shop/widget",
      priceCurrency: "USD",
      price: "25.00",
      availability: "https://schema.org/InStock",
    });
  });

  it("product marks out-of-stock", () => {
    const ld = product({ name: "X", url: "/shop/x", priceCents: 100, currency: "usd", inStock: false }, CTX);
    expect(ld.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(ld).not.toHaveProperty("image"); // no images → omitted
  });

  it("availabilityUrl maps the boolean", () => {
    expect(availabilityUrl(true)).toBe("https://schema.org/InStock");
    expect(availabilityUrl(false)).toBe("https://schema.org/OutOfStock");
  });

  it("event carries an absolute url + organizer, adds an offer when priced", () => {
    const ld = event({ name: "Consult", url: "/book/consult", description: "30 min", priceCents: 5000, currency: "usd" }, CTX);
    expect(ld["@type"]).toBe("Event");
    expect(ld.url).toBe("https://acme.test/book/consult");
    expect(ld.organizer).toMatchObject({ "@type": "Organization", name: "Acme" });
    expect(ld.offers).toMatchObject({ price: "50.00", priceCurrency: "USD" });
  });

  it("event omits offers when unpriced", () => {
    const ld = event({ name: "Free chat", url: "/book/free" }, CTX);
    expect(ld).not.toHaveProperty("offers");
  });

  it("faqPage nests question/answer pairs", () => {
    const ld = faqPage([{ question: "Q1?", answer: "A1" }]);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: "Q1?",
      acceptedAnswer: { "@type": "Answer", text: "A1" },
    });
  });
});
