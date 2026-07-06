import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { redirects } from "./schema";
import { compileRules, type CompiledRules, type EngineRule } from "./engine";

/**
 * Loads + compiles the redirect rule set for the proxy (src/proxy.ts). The
 * proxy runs in a context where "use cache" functions throw, so — exactly like
 * getDomainPolicyUncached — this reads UNCACHED and memoizes the COMPILED rule
 * set in module memory with a short TTL. Compilation (regex building, sorting)
 * happens once per memo window, never per request. `resetRedirectRulesMemo()`
 * (called on any redirect write) makes an edit take effect immediately in-process;
 * the TTL is the cross-instance backstop.
 */

let memo: { at: number; value: CompiledRules } | null = null;
const RULES_TTL_MS = 60_000;

/** Project a DB row to the shape the engine needs. */
function toEngineRule(r: typeof redirects.$inferSelect): EngineRule {
  const matchType = (["exact", "prefix", "wildcard", "regex"] as const).includes(
    r.matchType as never,
  )
    ? (r.matchType as EngineRule["matchType"])
    : "exact";
  const kind = (["redirect", "rewrite", "gone"] as const).includes(r.kind as never)
    ? (r.kind as EngineRule["kind"])
    : "redirect";
  return {
    id: r.id,
    matchType,
    kind,
    // Exact rules key on from_path; pattern/prefix rules use `pattern` (falling
    // back to from_path for older rows created before the pattern column).
    source: matchType === "exact" ? r.fromPath : r.pattern || r.fromPath,
    destination: kind === "gone" ? null : r.destination || r.toPath,
    code: r.code,
    caseSensitive: r.caseSensitive,
    preserveQuery: r.preserveQuery,
    position: r.position,
    conditions: r.conditions ?? [],
  };
}

/**
 * The compiled rule set, memoized. UNCACHED read (no "use cache") so it is safe
 * to call from the proxy. `now` is injectable for tests.
 */
export async function getCompiledRedirects(now: number = Date.now()): Promise<CompiledRules> {
  if (memo && now - memo.at < RULES_TTL_MS) return memo.value;
  let value: CompiledRules;
  try {
    const rows = await db
      .select()
      .from(redirects)
      .where(eq(redirects.enabled, true))
      .orderBy(asc(redirects.position));
    value = compileRules(rows.map(toEngineRule));
  } catch (err) {
    console.error("[redirects] rule load failed; serving empty set", err);
    value = compileRules([]);
  }
  memo = { at: now, value };
  return value;
}

/** Bust the in-process memo so a redirect edit applies at once. */
export function resetRedirectRulesMemo(): void {
  memo = null;
}
