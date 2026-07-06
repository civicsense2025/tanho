/**
 * Record-field binding: replace `{{record.<path>}}` tokens in a block's VALIDATED
 * content with values from the current repeater record.
 *
 * Runs AFTER safeParse (a token is a plain string that already passed validation)
 * and BEFORE Render, so the substituted value flows straight to Render with no
 * second validation gate that could fail-closed and blank the block. Pure deep-map
 * over string leaves; returns the SAME object when no token is present (non-bound
 * subtrees cost nothing).
 */

const TOKEN = /\{\{\s*record\.([\w.]+)\s*\}\}/g;

/** Dotted-path lookup into the record (e.g. "author.name"). */
function lookup(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, record);
}

/** Substitute tokens in one string. A whole-string token ("{{record.year}}")
 * yields the raw value stringified; inline tokens interpolate. Missing → "". */
function substituteString(s: string, record: Record<string, unknown>): string {
  if (!s.includes("{{")) return s;
  return s.replace(TOKEN, (_m, path: string) => {
    const v = lookup(record, path);
    return v == null ? "" : String(v);
  });
}

/** Deep-map any content value, substituting tokens in every string leaf. Preserves
 * structure and object identity where nothing changed. */
export function substituteRecordTokens<T>(value: T, record: Record<string, unknown>): T {
  if (typeof value === "string") return substituteString(value, record) as T;
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => {
      const nv = substituteRecordTokens(v, record);
      if (nv !== v) changed = true;
      return nv;
    });
    return (changed ? next : value) as T;
  }
  if (value && typeof value === "object") {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const nv = substituteRecordTokens(v, record);
      if (nv !== v) changed = true;
      out[k] = nv;
    }
    return (changed ? out : value) as T;
  }
  return value;
}
