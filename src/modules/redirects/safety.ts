import { normalizePath } from "./validation";

/**
 * Author-safety validators — PURE (no DB). Given a proposed batch of exact
 * redirects PLUS the site's existing redirect rules and real routes, surface
 * the mistakes that make a migration hurt: self-loops, redirect chains, a
 * source that shadows a live page, a target that goes nowhere, and duplicate
 * sources (fromPath is UNIQUE in the DB, so a dupe within a batch would make
 * the whole insert fail — it must be caught before commit).
 *
 * Errors BLOCK the commit; warnings are shown but the operator may proceed.
 * The caller (the server action / review UI) supplies `reservedRoutes` (real
 * published routes) — this module only compares, it doesn't query.
 */

/** A single from→to edge under consideration (batch rows + existing rules). */
export type SafetyRule = { from: string; to: string | null };

export type SafetyIssueKind =
  | "self-loop"
  | "chain"
  | "shadowed-route"
  | "dead-target"
  | "duplicate-source";

export type SafetyIssue = {
  kind: SafetyIssueKind;
  from: string;
  to?: string | null;
  detail: string;
};

export type SafetyReport = { errors: SafetyIssue[]; warnings: SafetyIssue[] };

/** Chain length past which we ERROR instead of warn (>3 hops is almost surely
 *  a mistake and risks the browser's own redirect-loop cutoff). */
export const MAX_CHAIN_LEN = 3;

/* ---------------------------------------------------------------- detectors */

/** A rule whose source normalizes to its own target — a no-op / self-redirect. */
export function detectSelfLoop(from: string, to: string | null): boolean {
  if (to == null) return false;
  return normalizePath(from) === normalizePath(to);
}

/**
 * Follow redirect edges from each source and return every chain of length ≥ 2
 * (A→B where B is itself a source: A→B→C…). Cycles are broken by a visited
 * set so a loop can't hang. Each returned chain is the list of normalized
 * paths visited, longest first per start node.
 */
export function detectChain(rows: SafetyRule[]): string[][] {
  // Map normalized source → normalized target (last write wins; duplicate
  // sources are reported separately).
  const next = new Map<string, string>();
  for (const r of rows) {
    if (r.to == null) continue;
    next.set(normalizePath(r.from), normalizePath(r.to));
  }

  const chains: string[][] = [];
  for (const start of next.keys()) {
    const path: string[] = [start];
    const seen = new Set<string>([start]);
    let cursor = start;
    while (next.has(cursor)) {
      const target = next.get(cursor)!;
      if (seen.has(target)) {
        path.push(target); // close the cycle so it's visible, then stop
        break;
      }
      path.push(target);
      seen.add(target);
      cursor = target;
    }
    // A chain only exists if the target is itself a source (path length > 2:
    // start, its target, and at least one further hop).
    if (path.length > 2) chains.push(path);
  }
  return chains;
}

/** A source path that equals a real published route — redirecting it would
 *  shadow (hide) a live page. Compared on normalizePath. */
export function detectShadowedRoute(from: string, reservedRoutes: string[]): boolean {
  const nf = normalizePath(from);
  return reservedRoutes.some((r) => normalizePath(r) === nf);
}

/**
 * A target that is neither a known route NOR itself the source of another
 * redirect → a dead link. `redirectSources` are the from-paths in play (batch
 * + existing), so a target that lands on another redirect is not "dead".
 */
export function detectDeadTarget(
  to: string | null,
  knownTargets: string[],
  redirectSources: string[],
): boolean {
  if (to == null) return false; // a Gone (410) has no target to be dead
  const nt = normalizePath(to);
  if (knownTargets.some((t) => normalizePath(t) === nt)) return false;
  if (redirectSources.some((s) => normalizePath(s) === nt)) return false;
  return true;
}

/** Sources that appear more than once (normalized). fromPath is UNIQUE in the
 *  DB, so these would fail the batch insert — returned as the offending
 *  normalized paths. */
export function detectDuplicateSources(rows: SafetyRule[]): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = normalizePath(r.from);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

/* ------------------------------------------------------------ report builder */

/**
 * Run every detector over a proposed batch and return a structured report.
 *
 * @param batch          the redirects about to be committed (from, to|null)
 * @param existing       existing redirect rules already stored (from, to|null)
 * @param knownTargets   real published routes that count as valid destinations
 * @param reservedRoutes real published routes a source must NOT shadow
 *
 * Classification:
 *  - self-loop         → ERROR (a stored self-redirect is never valid)
 *  - duplicate-source  → ERROR (would fail the unique-index insert)
 *  - chain > MAX_CHAIN_LEN hops → ERROR; chain of 2..MAX hops → WARNING
 *  - shadowed-route    → WARNING (operator may intend to retire the page)
 *  - dead-target       → WARNING (target may be published later)
 */
export function buildSafetyReport(
  batch: SafetyRule[],
  existing: SafetyRule[],
  knownTargets: string[],
  reservedRoutes: string[],
): SafetyReport {
  const errors: SafetyIssue[] = [];
  const warnings: SafetyIssue[] = [];

  // Self-loops (batch only — existing rules were already validated on write).
  for (const r of batch) {
    if (detectSelfLoop(r.from, r.to)) {
      errors.push({
        kind: "self-loop",
        from: r.from,
        to: r.to,
        detail: `"${r.from}" redirects to itself.`,
      });
    }
  }

  // Duplicate sources within the batch.
  for (const dupe of detectDuplicateSources(batch)) {
    errors.push({
      kind: "duplicate-source",
      from: dupe,
      detail: `"${dupe}" appears more than once — each source may map only once.`,
    });
  }

  // Chains across batch + existing edges.
  const allEdges = [...batch, ...existing];
  for (const chain of detectChain(allEdges)) {
    const hops = chain.length - 1;
    const label = chain.join(" → ");
    if (hops > MAX_CHAIN_LEN) {
      errors.push({
        kind: "chain",
        from: chain[0]!,
        to: chain[chain.length - 1]!,
        detail: `Redirect chain ${hops} hops long: ${label}. Point the source straight at the final URL.`,
      });
    } else {
      warnings.push({
        kind: "chain",
        from: chain[0]!,
        to: chain[chain.length - 1]!,
        detail: `Redirect chains through ${hops} hops: ${label}. Consider pointing straight at the final URL.`,
      });
    }
  }

  const batchSources = batch.map((r) => r.from);
  const existingSources = existing.map((r) => r.from);
  const allSources = [...batchSources, ...existingSources];

  for (const r of batch) {
    // Shadowed route: the source is a live page.
    if (detectShadowedRoute(r.from, reservedRoutes)) {
      warnings.push({
        kind: "shadowed-route",
        from: r.from,
        to: r.to,
        detail: `"${r.from}" is a live page — redirecting it will hide that page.`,
      });
    }
    // Dead target: goes nowhere real and isn't another redirect's source.
    if (detectDeadTarget(r.to, knownTargets, allSources)) {
      warnings.push({
        kind: "dead-target",
        from: r.from,
        to: r.to,
        detail: `"${r.to}" isn't a known page — this redirect may land on a 404.`,
      });
    }
  }

  return { errors, warnings };
}
