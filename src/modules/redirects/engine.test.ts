import { describe, expect, it } from "vitest";
import {
  compileRules,
  matchExactOrPrefix,
  hasPatternRules,
  globToRe2Source,
  type EngineRule,
} from "./engine";

/** Terse rule factory. */
function rule(p: Partial<EngineRule> & Pick<EngineRule, "matchType" | "source">): EngineRule {
  return {
    id: p.source,
    kind: "redirect",
    destination: p.destination ?? "/dest",
    code: 301,
    caseSensitive: false,
    preserveQuery: true,
    position: 0,
    conditions: [],
    ...p,
  };
}

const run = (rules: EngineRule[], path: string) => matchExactOrPrefix(compileRules(rules), path);

describe("exact tier", () => {
  it("matches an exact path", () => {
    const m = run([rule({ matchType: "exact", source: "/old", destination: "/new" })], "/old");
    expect(m?.destination).toBe("/new");
    expect(m?.code).toBe(301);
  });
  it("matches case-insensitively and ignores trailing slash (normalized)", () => {
    const r = [rule({ matchType: "exact", source: "/Old/", destination: "/new" })];
    expect(run(r, "/old")?.destination).toBe("/new");
    expect(run(r, "/OLD/")?.destination).toBe("/new");
  });
  it("returns null on no match", () => {
    expect(run([rule({ matchType: "exact", source: "/a" })], "/b")).toBeNull();
  });
});

describe("prefix tier", () => {
  it("redirects a folder and appends the remainder", () => {
    const m = run([rule({ matchType: "prefix", source: "/blog", destination: "/news" })], "/blog/my-post");
    expect(m?.destination).toBe("/news/my-post");
  });
  it("matches the bare prefix itself", () => {
    const m = run([rule({ matchType: "prefix", source: "/blog", destination: "/news" })], "/blog");
    expect(m?.destination).toBe("/news");
  });
  it("most-specific (longest) prefix wins regardless of order", () => {
    const rules = [
      rule({ matchType: "prefix", source: "/a", destination: "/short" }),
      rule({ matchType: "prefix", source: "/a/b", destination: "/long" }),
    ];
    expect(run(rules, "/a/b/c")?.destination).toBe("/long/c");
  });
  it("supports :splat in the destination", () => {
    const m = run([rule({ matchType: "prefix", source: "/docs", destination: "/help/:splat" })], "/docs/x/y");
    expect(m?.destination).toBe("/help/x/y");
  });
  it("does not treat a sibling with a shared prefix string as a subtree", () => {
    // /blog must NOT match /blogging — only the exact segment or a /-delimited child.
    expect(run([rule({ matchType: "prefix", source: "/blog", destination: "/news" })], "/blogging")).toBeNull();
  });
  it("preserves the ORIGINAL CASE of the passed-through remainder", () => {
    // matching is case-insensitive, but the remainder must not be lowercased —
    // the destination route may be case-sensitive (/news/My-Post ≠ /news/my-post).
    const m = run([rule({ matchType: "prefix", source: "/blog", destination: "/news" })], "/blog/My-Post");
    expect(m?.destination).toBe("/news/My-Post");
  });
});

describe("destination carrying its own query", () => {
  it("keeps a query in an exact destination (engine returns it verbatim; proxy splits it)", () => {
    const m = run([rule({ matchType: "exact", source: "/old", destination: "/new?ref=1" })], "/old");
    expect(m?.destination).toBe("/new?ref=1");
  });
});

describe("exact beats prefix", () => {
  it("prefers the exact rule for the same path", () => {
    const rules = [
      rule({ matchType: "prefix", source: "/a", destination: "/prefix" }),
      rule({ matchType: "exact", source: "/a/b", destination: "/exact" }),
    ];
    expect(run(rules, "/a/b")?.destination).toBe("/exact");
  });
});

describe("compileRules partitioning", () => {
  it("keeps wildcard + regex rules in the raw `patterns` list (not exact/prefix)", () => {
    const compiled = compileRules([
      rule({ matchType: "exact", source: "/e" }),
      rule({ matchType: "prefix", source: "/p" }),
      rule({ matchType: "wildcard", source: "/w/*" }),
      rule({ matchType: "regex", source: "^/r$" }),
    ]);
    expect(compiled.exact.size).toBe(1);
    expect(compiled.prefixes).toHaveLength(1);
    expect(compiled.patterns.map((p) => p.matchType)).toEqual(["wildcard", "regex"]);
  });
  it("orders patterns by ascending position", () => {
    const compiled = compileRules([
      rule({ matchType: "wildcard", source: "/b/*", position: 5 }),
      rule({ matchType: "wildcard", source: "/a/*", position: 1 }),
    ]);
    expect(compiled.patterns.map((p) => p.position)).toEqual([1, 5]);
  });
  it("hasPatternRules reflects presence of pattern rules", () => {
    expect(hasPatternRules(compileRules([rule({ matchType: "exact", source: "/x" })]))).toBe(false);
    expect(hasPatternRules(compileRules([rule({ matchType: "wildcard", source: "/x/*" })]))).toBe(true);
  });
});

describe("glob → RE2 source translation (pure)", () => {
  it("translates a glob to an anchored RE2 source", () => {
    expect(globToRe2Source("/blog/*")).toBe("^/blog/(.*)$");
    expect(globToRe2Source("/u/:id")).toBe("^/u/([^/]+)$");
  });
  it("escapes regex metacharacters in literal segments", () => {
    expect(globToRe2Source("/a.b")).toBe("^/a\\.b$");
  });
});

describe("rule kinds", () => {
  it("carries a gone (410) rule with null destination", () => {
    const m = run([rule({ matchType: "exact", source: "/dead", destination: null, kind: "gone", code: 410 })], "/dead");
    expect(m?.kind).toBe("gone");
    expect(m?.destination).toBeNull();
    expect(m?.code).toBe(410);
  });
});
