import { describe, expect, it } from "vitest";
import { compileRules, matchExactOrPrefix, type EngineRule } from "./engine";
import { matchPattern } from "./engine-patterns";

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

/** Match the pattern tier the way the route handler does: compile, then run
 *  patterns in position order over the raw path. */
const runPattern = (rules: EngineRule[], path: string) =>
  matchPattern(compileRules(rules).patterns, path);

describe("wildcard tier (glob → RE2)", () => {
  it("matches a wildcard and substitutes $1", () => {
    const m = runPattern(
      [rule({ matchType: "wildcard", source: "/blog/*", destination: "/articles/$1" })],
      "/blog/hello-world",
    );
    expect(m?.destination).toBe("/articles/hello-world");
  });
  it("substitutes :splat for the first capture", () => {
    const m = runPattern([rule({ matchType: "wildcard", source: "/old/*", destination: "/new/:splat" })], "/old/a/b");
    expect(m?.destination).toBe("/new/a/b");
  });
  it("does not match a non-matching wildcard", () => {
    expect(runPattern([rule({ matchType: "wildcard", source: "/blog/*" })], "/shop/x")).toBeNull();
  });
});

describe("regex tier (RE2)", () => {
  it("matches a raw regex with a capture group", () => {
    const m = runPattern([rule({ matchType: "regex", source: "^/p/(\\d+)$", destination: "/post/$1" })], "/p/123");
    expect(m?.destination).toBe("/post/123");
  });
  it("substitutes multi-digit captures ($10+), not just $1..$9", () => {
    // 11 groups; the destination references $10 and $11 — a single-digit-only
    // substitution would emit group-1 + a literal "0".
    const src = "^/" + Array.from({ length: 11 }, (_, i) => `(g${i})`).join("/") + "$";
    const path = "/" + Array.from({ length: 11 }, (_, i) => `g${i}`).join("/");
    const m = runPattern([rule({ matchType: "regex", source: src, destination: "/x/$10/$11" })], path);
    expect(m?.destination).toBe("/x/g9/g10");
  });
  it("respects case sensitivity when set", () => {
    const r = [rule({ matchType: "regex", source: "^/CaseMatters$", destination: "/x", caseSensitive: true })];
    expect(runPattern(r, "/casematters")).toBeNull();
    expect(runPattern(r, "/CaseMatters")?.destination).toBe("/x");
  });
  it("is ReDoS-safe — a catastrophic pattern returns fast, never hangs", () => {
    const r = [rule({ matchType: "regex", source: "(a+)+$", destination: "/x" })];
    const t0 = Date.now();
    runPattern(r, "a".repeat(40) + "X"); // adversarial input for a backtracking engine
    expect(Date.now() - t0).toBeLessThan(100); // RE2 is linear — no exponential blowup
  });
  it("drops an uncompilable rule instead of throwing (validation is the real gate)", () => {
    // backreference — RE2 rejects at compile; engine must not crash.
    const r = [rule({ matchType: "regex", source: "(a)\\1", destination: "/x" })];
    expect(() => runPattern(r, "/anything")).not.toThrow();
    expect(runPattern(r, "aa")).toBeNull();
  });
});

describe("within-pattern precedence", () => {
  it("lower position wins", () => {
    const rules = [
      rule({ matchType: "wildcard", source: "/x/*", destination: "/second", position: 2 }),
      rule({ matchType: "wildcard", source: "/x/*", destination: "/first", position: 1 }),
    ];
    expect(runPattern(rules, "/x/y")?.destination).toBe("/first");
  });
});

describe("cross-tier precedence (proxy order: exact/prefix first, then patterns)", () => {
  it("exact beats prefix beats pattern for the same path", () => {
    const rules = [
      rule({ matchType: "wildcard", source: "/a/*", destination: "/pattern" }),
      rule({ matchType: "prefix", source: "/a", destination: "/prefix" }),
      rule({ matchType: "exact", source: "/a/b", destination: "/exact" }),
    ];
    const compiled = compileRules(rules);
    // The proxy consults exact/prefix first; only a miss falls to patterns.
    const first = matchExactOrPrefix(compiled, "/a/b");
    expect(first?.destination).toBe("/exact");
  });
  it("falls through to the pattern tier only when exact/prefix miss", () => {
    const rules = [
      rule({ matchType: "exact", source: "/a/b", destination: "/exact" }),
      rule({ matchType: "wildcard", source: "/c/*", destination: "/pattern/$1" }),
    ];
    const compiled = compileRules(rules);
    expect(matchExactOrPrefix(compiled, "/c/deep/path")).toBeNull();
    expect(matchPattern(compiled.patterns, "/c/deep/path")?.destination).toBe("/pattern/deep/path");
  });
});
