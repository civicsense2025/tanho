import { describe, expect, it } from "vitest";
import { baseSegment, detailRouteSource, indexRouteSource } from "./scaffold";

describe("baseSegment", () => {
  it("strips a leading slash to the single segment", () => {
    expect(baseSegment("/products")).toBe("products");
    expect(baseSegment("products")).toBe("products");
  });

  it("takes only the first segment", () => {
    expect(baseSegment("/products/extra")).toBe("products");
  });

  it("rejects an unsafe segment (no path escape)", () => {
    expect(() => baseSegment("../secret")).toThrow();
    expect(() => baseSegment("/foo-bar")).toThrow(); // hyphen isn't a valid SQL/dir identifier
  });
});

describe("indexRouteSource", () => {
  const src = indexRouteSource("products");

  it("embeds the slug as a JSON string constant", () => {
    expect(src).toContain('const SLUG = "products";');
  });

  it("awaits nothing invalid and wraps the body in Suspense with an inner async component", () => {
    expect(src).toContain("<Suspense fallback={null}>");
    expect(src).toContain("async function Inner()");
  });

  it("exports generateMetadata and the default Page", () => {
    expect(src).toContain("export async function generateMetadata()");
    expect(src).toContain("export default function Page()");
  });

  it("delegates to the shared ContentTypeIndex", () => {
    expect(src).toContain("ContentTypeIndex");
    expect(src).toContain("@/modules/content-pages/public/ContentTypeIndex");
  });

  it("obeys Cache Components: no `export const dynamic`, no generateStaticParams", () => {
    expect(src).not.toContain("export const dynamic");
    expect(src).not.toContain("generateStaticParams");
  });
});

describe("detailRouteSource", () => {
  const src = detailRouteSource("products");

  it("embeds the slug and a Params type", () => {
    expect(src).toContain('const SLUG = "products";');
    expect(src).toContain("type Params = { slug: string }");
  });

  it("awaits params in both the page body and generateMetadata", () => {
    expect(src).toContain("params: Promise<Params>");
    expect(src).toContain("const { slug } = await params;");
  });

  it("wraps the body in Suspense passing params to an inner async component", () => {
    expect(src).toContain("<Suspense fallback={null}>");
    expect(src).toContain("<Inner params={params} />");
    expect(src).toContain("async function Inner({ params }: { params: Promise<Params> })");
  });

  it("exports generateMetadata and the default Page and delegates to ContentTypeDetail", () => {
    expect(src).toContain("export async function generateMetadata(");
    expect(src).toContain("export default function Page({ params }");
    expect(src).toContain("ContentTypeDetail");
  });

  it("calls notFound() when the type or row is missing", () => {
    expect(src).toContain("notFound()");
  });

  it("obeys Cache Components: no `export const dynamic`, no generateStaticParams", () => {
    expect(src).not.toContain("export const dynamic");
    expect(src).not.toContain("generateStaticParams");
  });
});
