import { describe, expect, it } from "vitest";
import { isSameOriginPath, redirectInputSchema, normalizePath, isIdentityRedirect } from "./validation";

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

  it("rejects an identity mapping — new URL already equals the old (no redirect needed)", () => {
    const res = redirectInputSchema.safeParse({ fromPath: "/same/", toPath: "/same", code: 301 });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0]?.message).toMatch(/same URL/i);
  });
});

describe("normalizePath", () => {
  it("strips query + hash, trailing slash, dupe slashes, and lowercases", () => {
    expect(normalizePath("/A//B/?x=1#y")).toBe("/a/b");
    expect(normalizePath("/")).toBe("/"); // root keeps its slash
  });
});

describe("isIdentityRedirect", () => {
  it("catches identity differing only by slash / case / query", () => {
    expect(isIdentityRedirect("/about", "/about")).toBe(true);
    expect(isIdentityRedirect("/About/", "/about")).toBe(true);
    expect(isIdentityRedirect("/p?ref=x", "/p")).toBe(true);
  });
  it("is false for genuinely different paths", () => {
    expect(isIdentityRedirect("/old", "/new")).toBe(false);
    expect(isIdentityRedirect("/a/b", "/a/c")).toBe(false);
  });
});
