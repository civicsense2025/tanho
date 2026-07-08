/**
 * Env-var prefix resolver.
 *
 * A deployment may namespace every env var with a single prefix (e.g. on a
 * shared hosting env group: `TANHO_DATABASE_URL`, `TANHO_APP_URL`, …) to keep
 * its vars distinct from a sibling service's. Rather than wiring each of the
 * ~57 `process.env.X` reads to also check a prefixed name, this module copies
 * prefixed vars to their canonical names once at boot — every existing read
 * then keeps working unchanged.
 *
 * Prefix is resolved, in priority order:
 *   1. `ENV_PREFIX` env var, if set (normalized to uppercase + trailing `_`).
 *      This is the explicit, unambiguous, production-recommended path.
 *   2. Auto-detect: scan for an anchor var `*_<ANCHOR>` (DATABASE_URL first,
 *      then APP_URL) and use the captured prefix. When several candidate
 *      prefixes exist, the one covering the most prefixed vars wins (tie-break
 *      by longest, then lexicographic) — deterministic. If none, prefix is "".
 *
 * For every env key starting with `${prefix}`, the canonical (prefix-stripped)
 * name is set **only when not already defined** — canonical always wins, so an
 * explicit canonical value overrides a prefixed one and per-var overrides stay
 * possible. The copy is generic (no curated var list), so new env vars are
 * covered automatically. `NEXT_PUBLIC_*` is handled by the same strip; because
 * Next inlines those at build time, the resolver must also run from
 * `next.config.ts` (not only the runtime `instrumentation.ts` hook).
 *
 * Idempotent and side-effect-only-on-process.env: safe to call from every
 * entry point (next.config, instrumentation, drizzle.config, seed/lib).
 */

/** Anchor suffixes used to auto-detect the prefix, in priority order. */
const AUTO_DETECT_ANCHORS = ["DATABASE_URL", "APP_URL"] as const;

/** A valid prefix is uppercase ASCII letters/digits/underscore, ending in `_`. */
function normalizePrefix(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (!upper) return "";
  // Strip a non-underscore tail only if it's clearly not already a prefix;
  // accept "TANHO" and "TANHO_" equally.
  const withUnderscore = upper.endsWith("_") ? upper : `${upper}_`;
  return /^[A-Z][A-Z0-9_]*_$/.test(withUnderscore) ? withUnderscore : "";
}

/**
 * Pure prefix detection (no mutation) — exported for tests. Returns "" when no
 * prefix can be determined.
 */
export function detectEnvPrefix(env: NodeJS.ProcessEnv): string {
  const explicit = normalizePrefix(env.ENV_PREFIX ?? "");
  if (explicit) return explicit;

  // Tally how many env vars each candidate prefix covers, so a multi-anchor
  // scan still resolves to a single deterministic winner.
  const counts = new Map<string, number>();
  for (const key of Object.keys(env)) {
    for (const anchor of AUTO_DETECT_ANCHORS) {
      // Match `<PREFIX>_<ANCHOR>` where PREFIX is non-empty and uppercase.
      // The anchor is a full segment, so require the char before it to be `_`.
      const suffix = `_${anchor}`;
      if (key.endsWith(suffix) && key.length > suffix.length) {
        const prefix = key.slice(0, key.length - anchor.length); // includes trailing `_`
        if (/^[A-Z][A-Z0-9_]*_$/.test(prefix)) {
          counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
        }
      }
    }
  }
  if (counts.size === 0) return "";
  let best = "";
  let bestCount = -1;
  for (const [prefix, count] of counts) {
    if (
      count > bestCount ||
      (count === bestCount &&
        (prefix.length > best.length || (prefix.length === best.length && prefix < best)))
    ) {
      best = prefix;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Resolve the active prefix and copy every prefixed env var to its canonical
 * (prefix-stripped) name when that name is not already set. Mutates
 * `process.env` in place. Returns the prefix it applied ("" = no-op).
 *
 * Idempotent: a second call finds canonical names already populated and skips.
 */
export function resolveEnvPrefix(env: NodeJS.ProcessEnv = process.env): string {
  const prefix = detectEnvPrefix(env);
  if (!prefix) return "";
  for (const key of Object.keys(env)) {
    if (!key.startsWith(prefix) || key === prefix) continue;
    const canonical = key.slice(prefix.length);
    if (!canonical) continue;
    if (env[canonical] === undefined || env[canonical] === "") {
      env[canonical] = env[key];
    }
  }
  return prefix;
}
