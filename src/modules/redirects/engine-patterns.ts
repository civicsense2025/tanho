import RE2 from "re2";
import { globToRe2Source, toMatch, type EngineRule, type RedirectMatch } from "./engine";

/**
 * The PATTERN half of the redirect engine — wildcard + regex matching with re2.
 *
 * re2 is a native module: it loads fine in a normal server context (route
 * handlers, server actions) but NOT in the proxy bundle (src/proxy.ts is
 * compiled edge-style and can't resolve native .node files). So this module is
 * imported only by the /api/redirect-resolve route handler, which the proxy
 * calls on an exact/prefix miss. re2 gives a linear-time guarantee, so a
 * catastrophic user pattern can never hang the process — the ReDoS class is
 * eliminated. (re2 is marked in serverExternalPackages so it's require()'d at
 * runtime rather than bundled — the bundler can't inline a .node binary.)
 */

type CompiledPattern = { rule: EngineRule; re: RE2 };

/** Compile one pattern rule (wildcard translated to regex; regex used as-is). */
function compileOne(rule: EngineRule): CompiledPattern | null {
  try {
    const src = rule.matchType === "wildcard" ? globToRe2Source(rule.source) : rule.source;
    const flags = rule.caseSensitive ? "" : "i";
    return { rule, re: new RE2(src, flags) };
  } catch {
    // An uncompilable rule is dropped rather than breaking the set (validation
    // rejects these at save time, so this is defence in depth).
    return null;
  }
}

/** Substitute $1, $2, … $N (any number of groups) and :splat into a destination. */
function applyCaptures(destination: string, match: RegExpMatchArray): string {
  return destination
    .replace(/\$(\d+)/g, (_, n: string) => match[Number(n)] ?? "")
    .replace(/:splat\b/g, () => match[1] ?? "");
}

/**
 * Match `rawPath` against the (already position-sorted) pattern rules, first
 * match wins. Compiles the rules on each call — the caller (the route handler)
 * receives an already-small pattern list from the memoized rule set, and the
 * pattern tier is only reached on an exact/prefix miss, so this stays cheap.
 */
export function matchPattern(patterns: EngineRule[], rawPath: string): RedirectMatch | null {
  for (const rule of patterns) {
    const compiled = compileOne(rule);
    if (!compiled) continue;
    const m = rawPath.match(compiled.re as unknown as RegExp);
    if (m) {
      const dest = rule.destination ? applyCaptures(rule.destination, m) : null;
      return toMatch(rule, dest);
    }
  }
  return null;
}
