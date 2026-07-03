import { describe, expect, it } from "vitest";
import { isSameOriginPath, redirectInputSchema } from "./validation";

describe("isSameOriginPath", () => {
  it("accepts a root-relative path", () => {
    expect(isSameOriginPath("/new-url")).toBe(true);
    expect(isSameOriginPath("/a/b/c")).toBe(true);
  });

  it("rejects external absolute URLs", () => {
    expect(isSameOriginPath("https://evil.com")).toBe(false);
    expect(isSameOriginPath("http://evil.com/path")).toBe(false);
  });

  it("rejects protocol-relative URLs (//host)", () => {
    expect(isSameOriginPath("//evil.com")).toBe(false);
  });

  it("rejects scheme-smuggling and slash tricks", () => {
    expect(isSameOriginPath("/\\evil.com")).toBe(false);
    expect(isSameOriginPath("/%2f%2fevil.com")).toBe(false);
    expect(isSameOriginPath("/javascript:alert(1)")).toBe(false);
    expect(isSameOriginPath("relative-no-slash")).toBe(false);
  });
});

describe("redirectInputSchema", () => {
  it("rejects a redirect whose target is an external URL (open-redirect guard)", () => {
    const res = redirectInputSchema.safeParse({
      fromPath: "/old",
      toPath: "https://evil.com/steal",
      code: 301,
    });
    expect(res.success).toBe(false);
  });

  it("rejects a protocol-relative target", () => {
    const res = redirectInputSchema.safeParse({
      fromPath: "/old",
      toPath: "//evil.com",
      code: 302,
    });
    expect(res.success).toBe(false);
  });

  it("accepts a same-origin relative redirect", () => {
    const res = redirectInputSchema.safeParse({
      fromPath: "/old",
      toPath: "/new",
      code: 301,
    });
    expect(res.success).toBe(true);
  });

  it("rejects an unsupported status code", () => {
    const res = redirectInputSchema.safeParse({
      fromPath: "/old",
      toPath: "/new",
      code: 307,
    });
    expect(res.success).toBe(false);
  });
});
