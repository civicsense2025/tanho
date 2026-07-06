import { describe, expect, it } from "vitest";
import { canonicalRedirect, canonicalPolicyActive } from "./canonical";

const NOOP = { wwwPolicy: "as-is", trailingSlash: "as-is" } as const;

describe("canonicalRedirect — loop safety", () => {
  it("returns null when both policies are as-is (never redirects)", () => {
    expect(canonicalRedirect({ host: "example.com", pathname: "/foo" }, NOOP)).toBeNull();
    expect(canonicalRedirect({ host: "www.example.com", pathname: "/foo/" }, NOOP)).toBeNull();
  });

  it("returns null once the request already matches the policy (no second hop)", () => {
    // force-apex + strip: an apex host with no trailing slash is already canonical.
    const p = { wwwPolicy: "force-apex", trailingSlash: "strip" } as const;
    expect(canonicalRedirect({ host: "example.com", pathname: "/foo" }, p)).toBeNull();
  });
});

describe("canonicalRedirect — www policy", () => {
  it("force-www adds www when missing", () => {
    expect(canonicalRedirect({ host: "example.com", pathname: "/x" }, { wwwPolicy: "force-www", trailingSlash: "as-is" }))
      .toEqual({ host: "www.example.com", pathname: "/x" });
  });

  it("force-www is a no-op when www already present", () => {
    expect(canonicalRedirect({ host: "www.example.com", pathname: "/x" }, { wwwPolicy: "force-www", trailingSlash: "as-is" }))
      .toBeNull();
  });

  it("force-apex strips www", () => {
    expect(canonicalRedirect({ host: "www.example.com", pathname: "/x" }, { wwwPolicy: "force-apex", trailingSlash: "as-is" }))
      .toEqual({ host: "example.com", pathname: "/x" });
  });

  it("force-apex is a no-op on an apex host", () => {
    expect(canonicalRedirect({ host: "example.com", pathname: "/x" }, { wwwPolicy: "force-apex", trailingSlash: "as-is" }))
      .toBeNull();
  });
});

describe("canonicalRedirect — trailing slash", () => {
  it("strip removes a trailing slash", () => {
    expect(canonicalRedirect({ host: "h", pathname: "/foo/" }, { wwwPolicy: "as-is", trailingSlash: "strip" }))
      .toEqual({ host: "h", pathname: "/foo" });
  });

  it("add appends a trailing slash", () => {
    expect(canonicalRedirect({ host: "h", pathname: "/foo" }, { wwwPolicy: "as-is", trailingSlash: "add" }))
      .toEqual({ host: "h", pathname: "/foo/" });
  });

  it("never touches the root", () => {
    expect(canonicalRedirect({ host: "h", pathname: "/" }, { wwwPolicy: "as-is", trailingSlash: "strip" })).toBeNull();
    expect(canonicalRedirect({ host: "h", pathname: "/" }, { wwwPolicy: "as-is", trailingSlash: "add" })).toBeNull();
  });

  it("never rewrites a file-looking path (e.g. sitemap.xml)", () => {
    expect(canonicalRedirect({ host: "h", pathname: "/sitemap.xml" }, { wwwPolicy: "as-is", trailingSlash: "add" })).toBeNull();
    expect(canonicalRedirect({ host: "h", pathname: "/file.pdf" }, { wwwPolicy: "as-is", trailingSlash: "strip" })).toBeNull();
  });

  it("collapses multiple trailing slashes to none under strip", () => {
    expect(canonicalRedirect({ host: "h", pathname: "/a///" }, { wwwPolicy: "as-is", trailingSlash: "strip" }))
      .toEqual({ host: "h", pathname: "/a" });
  });
});

describe("canonicalRedirect — combined", () => {
  it("applies host + slash together in one redirect", () => {
    expect(
      canonicalRedirect({ host: "www.example.com", pathname: "/foo/" }, { wwwPolicy: "force-apex", trailingSlash: "strip" }),
    ).toEqual({ host: "example.com", pathname: "/foo" });
  });
});

describe("canonicalPolicyActive", () => {
  it("is false only when both are as-is", () => {
    expect(canonicalPolicyActive(NOOP)).toBe(false);
    expect(canonicalPolicyActive({ wwwPolicy: "force-www", trailingSlash: "as-is" })).toBe(true);
    expect(canonicalPolicyActive({ wwwPolicy: "as-is", trailingSlash: "strip" })).toBe(true);
  });
});
