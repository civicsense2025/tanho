import { normalizePath } from "./validation";
import type { RedirectCondition } from "./schema";

/**
 * The redirect matching engine — PROXY-SAFE half. Exact + prefix matching is
 * pure JS (no native deps), so it runs directly in src/proxy.ts, which is
 * bundled edge-style and cannot load native modules like re2.
 *
 * Wildcard/regex matching needs re2 (linear-time, ReDoS-safe) which only loads
 * in a normal server context, so it lives in ./engine-patterns.ts and runs in
 * the /api/redirect-resolve route handler the proxy calls on a miss. This module
 * holds everything both halves share: the rule/match types, glob→regex
 * translation, and the exact+prefix tiers.
 *
 * Match order (cheapest first): exact (Map, O(1)) → prefix (longest wins) →
 * [patterns, evaluated in the route handler].
 */

/** A rule as the engine needs it (a projection of the DB row). */
export type EngineRule = {
  id: string;
  matchType: "exact" | "prefix" | "wildcard" | "regex";
  kind: "redirect" | "rewrite" | "gone";
  /** exact source (from_path) OR the raw pattern for prefix/wildcard/regex. */
  source: string;
  /** destination (to_path for exact; may contain $1/:splat for patterns). null for `gone`. */
  destination: string | null;
  code: number;
  caseSensitive: boolean;
  preserveQuery: boolean;
  position: number;
  conditions: RedirectCondition[];
};

/** The outcome of a match — enough for the proxy to act. */
export type RedirectMatch = {
  ruleId: string;
  kind: "redirect" | "rewrite" | "gone";
  /** Resolved destination with captures substituted (null for `gone`). */
  destination: string | null;
  code: number;
  preserveQuery: boolean;
  conditions: RedirectCondition[];
};

/** The exact + prefix tiers, compiled once. Pattern rules are kept raw for the
 *  route handler to compile with re2 (see ./engine-patterns.ts). */
export type CompiledRules = {
  exact: Map<string, EngineRule>;
  /** Prefix rules, sorted longest-source-first so the most specific wins. */
  prefixes: Array<{ prefix: string; rule: EngineRule }>;
  /** Raw wildcard + regex rules (position asc) — NOT compiled here. */
  patterns: EngineRule[];
};

/** Escape a string for literal use inside a regex. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Translate a glob/wildcard source to a regex source (used by re2 in the route
 * handler; kept here because it's pure and unit-tested).
 *   `*`      → a greedy segment-spanning capture, referenced as :splat / $1
 *   `:name`  → a single-segment named capture, referenced as :name
 * Everything else is escaped literally. Anchored on both ends.
 */
export function globToRe2Source(glob: string): string {
  let out = "^";
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i]!;
    if (ch === "*") {
      out += "(.*)";
      i++;
    } else if (ch === ":") {
      let j = i + 1;
      while (j < glob.length && /[a-zA-Z0-9_]/.test(glob[j]!)) j++;
      if (j > i + 1) {
        out += "([^/]+)";
        i = j;
      } else {
        out += "\\:";
        i++;
      }
    } else {
      out += escapeRegex(ch);
      i++;
    }
  }
  return out + "$";
}

/** Compile a rule set into exact + prefix tiers; pattern rules pass through raw. */
export function compileRules(rules: EngineRule[]): CompiledRules {
  const exact = new Map<string, EngineRule>();
  const prefixes: Array<{ prefix: string; rule: EngineRule }> = [];
  const patternRules: EngineRule[] = [];

  for (const r of rules) {
    if (r.matchType === "exact") {
      exact.set(normalizePath(r.source), r);
    } else if (r.matchType === "prefix") {
      prefixes.push({ prefix: normalizePath(r.source), rule: r });
    } else {
      patternRules.push(r);
    }
  }

  prefixes.sort((a, b) => b.prefix.length - a.prefix.length);
  patternRules.sort((a, b) => a.position - b.position);
  return { exact, prefixes, patterns: patternRules };
}

/** Whether the rule set has any wildcard/regex rules (→ on an exact/prefix miss
 *  the proxy must call the pattern route handler). */
export function hasPatternRules(compiled: CompiledRules): boolean {
  return compiled.patterns.length > 0;
}

/** Build a RedirectMatch from a rule + resolved destination. */
export function toMatch(rule: EngineRule, destination: string | null): RedirectMatch {
  return {
    ruleId: rule.id,
    kind: rule.kind,
    destination,
    code: rule.code,
    preserveQuery: rule.preserveQuery,
    conditions: rule.conditions,
  };
}

/**
 * Match the EXACT and PREFIX tiers only (pure JS — safe in the proxy). Returns
 * the match, or null if no exact/prefix rule matched (the caller then consults
 * the pattern tier via the route handler when hasPatternRules is true).
 */
export function matchExactOrPrefix(compiled: CompiledRules, rawPath: string): RedirectMatch | null {
  const norm = normalizePath(rawPath);
  // Same normalization as `norm` but WITHOUT lowercasing, so the passed-through
  // prefix remainder keeps its original case (the destination route may be
  // case-sensitive; folding "/blog/My-Post" to "my-post" would 301 to a 404).
  // Matching still uses the lowercased `norm`; only the slice preserves case.
  const cased = (rawPath.split(/[?#]/, 1)[0] ?? rawPath).replace(/\/{2,}/g, "/").replace(/(.)\/+$/, "$1");

  const hit = compiled.exact.get(norm);
  if (hit) return toMatch(hit, hit.destination);

  for (const { prefix, rule } of compiled.prefixes) {
    if (norm === prefix || norm.startsWith(prefix + "/")) {
      // Slice the remainder from the case-preserved path at the same offset
      // (norm and cased differ only in case, so lengths align).
      const remainder = cased.slice(prefix.length).replace(/^\//, "");
      const dest = rule.destination
        ? rule.destination.includes(":splat")
          ? rule.destination.replace(/:splat\b/g, remainder)
          : rule.destination.replace(/\/$/, "") + (remainder ? "/" + remainder : "")
        : null;
      return toMatch(rule, dest);
    }
  }
  return null;
}
