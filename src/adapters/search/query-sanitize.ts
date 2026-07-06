/**
 * A raw user search string is NEVER passed to FTS5's MATCH or Postgres's
 * websearch_to_tsquery as-is treated as trusted query syntax — this is the
 * shared sanitizer both dialects build their query from (mirrors QuerySpec's
 * "never a raw query string" philosophy in adapters/types.ts, applied here to
 * a mini query LANGUAGE rather than a table/column allowlist).
 *
 * Splits on whitespace, drops empty/oversized tokens, caps token count. The
 * caller decides how to join/escape tokens for its own dialect's syntax.
 */
const MAX_TOKENS = 12;
const MAX_TOKEN_LEN = 80;

export function tokenizeSearchQuery(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && t.length <= MAX_TOKEN_LEN)
    .slice(0, MAX_TOKENS);
}

/**
 * FTS5-safe form: each token individually double-quoted (a literal phrase,
 * never interpreted as FTS5 boolean/column/prefix syntax) with embedded
 * quotes doubled per FTS5's own escaping rule, then space-joined — FTS5
 * treats adjacent phrases as an implicit AND. Verified this neutralizes every
 * malformed-input case that otherwise throws SQLITE_ERROR from sqlite3
 * (trailing "OR", unbalanced quotes, bare "-"/"*", stray parens) and that a
 * token containing a literal quote can't break out of its phrase.
 */
export function toFts5MatchQuery(raw: string): string | null {
  const tokens = tokenizeSearchQuery(raw);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"`).join(" ");
}

/**
 * Postgres-safe form: websearch_to_tsquery already parses a natural search
 * string (quotes, OR, -exclude) without ever throwing on malformed input —
 * unlike plainto_tsquery/to_tsquery, it degrades gracefully instead of
 * erroring (Postgres's own documented behavior). Still route through the
 * shared tokenizer first so both dialects apply the same length/count caps
 * and neither trusts an arbitrarily long raw string.
 */
export function toPostgresWebSearchQuery(raw: string): string | null {
  const tokens = tokenizeSearchQuery(raw);
  if (tokens.length === 0) return null;
  return tokens.join(" ");
}
