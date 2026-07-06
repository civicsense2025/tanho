import { describe, expect, it } from "vitest";
import { dynamicOgUrl, DYNAMIC_OG_PATH } from "./og-image";

describe("dynamicOgUrl", () => {
  it("returns the bare path when there is nothing to encode", () => {
    expect(dynamicOgUrl()).toBe(DYNAMIC_OG_PATH);
  });

  it("encodes the title", () => {
    expect(dynamicOgUrl("Hello World")).toBe(`${DYNAMIC_OG_PATH}?title=Hello+World`);
  });

  it("encodes title + tag", () => {
    const url = dynamicOgUrl("Post", "News");
    expect(url).toContain("title=Post");
    expect(url).toContain("tag=News");
  });

  it("clamps an overlong title to 120 chars", () => {
    const long = "x".repeat(500);
    const url = dynamicOgUrl(long);
    const title = new URL(url, "https://acme.test").searchParams.get("title")!;
    expect(title.length).toBe(120);
  });

  it("percent-encodes unsafe characters (no query injection)", () => {
    const url = dynamicOgUrl("a&b=c d");
    expect(url).not.toContain("a&b=c");
    expect(new URL(url, "https://acme.test").searchParams.get("title")).toBe("a&b=c d");
  });
});
