import { describe, expect, it } from "vitest";
import { pathSimilarity } from "./similarity";

describe("pathSimilarity", () => {
  it("returns 1 for identical paths", () => {
    expect(pathSimilarity("/blog/hello", "/blog/hello")).toBe(1);
  });

  it("returns 1 for paths that normalize equal (case / trailing slash)", () => {
    expect(pathSimilarity("/Blog/Hello/", "/blog/hello")).toBe(1);
  });

  it("stays within [0,1] for arbitrary inputs", () => {
    for (const [a, b] of [
      ["/a", "/b"],
      ["/one/two/three", "/x"],
      ["", ""],
      ["/", "/deeply/nested/path"],
    ] as const) {
      const s = pathSimilarity(a, b);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("scores a near-miss (typo) high", () => {
    // one-char difference in a long slug
    expect(pathSimilarity("/about-us", "/about-uss")).toBeGreaterThan(0.8);
  });

  it("scores a moved-but-same-slug path reasonably (segment overlap helps)", () => {
    // /blog/2020/hello → /posts/2020/hello shares two of three segments
    expect(pathSimilarity("/blog/2020/hello", "/posts/2020/hello")).toBeGreaterThan(0.6);
  });

  it("scores disjoint paths low", () => {
    expect(pathSimilarity("/contact", "/pricing/enterprise/annual")).toBeLessThan(0.5);
  });

  it("is symmetric", () => {
    const a = "/products/widgets/blue";
    const b = "/shop/widgets/blue";
    expect(pathSimilarity(a, b)).toBeCloseTo(pathSimilarity(b, a), 10);
  });
});
