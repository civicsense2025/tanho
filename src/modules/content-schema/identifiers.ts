/**
 * Identifier safety for the content-schema DDL engine.
 *
 * DDL identifiers (table/column names) can never be bound parameters, so every
 * name that reaches a `CREATE/ALTER/DROP` statement is validated here first —
 * belt-and-suspenders over `sql.identifier`'s per-dialect quoting. The rule
 * mirrors `identifierSchema` in `src/modules/data-sources/validation.ts` (a
 * plain SQL identifier, ≤63 chars, no prototype-pollution keys); field keys
 * are already validated even more strictly (`^[a-z][a-z0-9_]*$`, ≤40) by the
 * custom-types field schema, so this is a redundant final gate, not the
 * primary one.
 */

/** Reserved names that enable prototype pollution — never a valid identifier. */
const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

/** SQL-identifier shape: starts with a letter/underscore, then word chars, ≤63. */
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Throw if `name` is not a safe SQL identifier; otherwise return it unchanged
 * so it can be used as `assertIdentifier(x)` inline. Never let an unvalidated
 * name reach a DDL string.
 */
export function assertIdentifier(name: string): string {
  if (typeof name !== "string" || name.length < 1 || name.length > 63 || !IDENT_RE.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${JSON.stringify(name)}`);
  }
  if (FORBIDDEN.has(name)) {
    throw new Error(`Reserved SQL identifier is not allowed: ${name}`);
  }
  return name;
}

/**
 * Physical table name for a content type's slug. Custom-type slugs are
 * lower-kebab (`my-type`), but table names can't contain hyphens, so they're
 * mapped to underscores and prefixed `ct_` (the reserved namespace for
 * runtime-created content tables — the static schema never uses it). The
 * result is validated as an identifier before return.
 */
export function tableNameForSlug(slug: string): string {
  const normalized = slug.replace(/-/g, "_");
  return assertIdentifier(`ct_${normalized}`);
}
