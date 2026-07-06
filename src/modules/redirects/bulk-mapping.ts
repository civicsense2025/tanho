import { XMLParser } from "fast-xml-parser";
import { isSameOriginPath, normalizePath } from "./validation";
import { pathSimilarity } from "./similarity";

/**
 * Bulk redirect mapping — PURE core (no DB, no "use server"), so every parser
 * and the proposal heuristic are unit-testable and importable from either the
 * server action or a test. The server action (actions.ts) supplies the real
 * `knownTargets` (published routes) and persists; this module only turns raw
 * input into reviewable {from → to} proposals.
 */

/** One raw source row parsed from pasted text / CSV / a sitemap. */
export type SourceRow = { from: string; to?: string };

/** Similarity at/above which a fuzzy target match is offered as a proposal. */
export const SIMILARITY_THRESHOLD = 0.8;

/**
 * A reviewable mapping decision for one source path. `matchType` is always
 * "exact" — bulk import creates exact rules only (patterns are authored by
 * hand in the rules UI). `to === null` with reason "none-gone" is a 410
 * (Gone) candidate: the old URL has no home on the new site.
 */
export type MappingProposal = {
  from: string;
  to: string | null;
  matchType: "exact";
  /** 0..1 confidence in this proposal (drives review sort + the % badge). */
  confidence: number;
  reason: "identity" | "exact-existing" | "similar" | "none-gone";
  note?: string;
};

/* ------------------------------------------------------------------ parsing */

/** A line is a comment/blank if, trimmed, it is empty or starts with '#'. */
function isSkippableLine(line: string): boolean {
  const t = line.trim();
  return t === "" || t.startsWith("#");
}

/**
 * Split a single "from → to" line on the first supported separator. Accepts
 * `from,to`, `from\tto`, `from → to` (unicode arrow) and `from -> to` (ascii).
 * A line with no separator is treated as `from` only (a Gone / to-be-mapped
 * candidate). Only the FIRST separator splits, so a target containing a comma
 * inside a query string is not further mangled here.
 */
function splitPair(line: string): SourceRow {
  const arrow = line.match(/\s*(?:→|->)\s*/);
  if (arrow && arrow.index !== undefined) {
    return {
      from: line.slice(0, arrow.index).trim(),
      to: line.slice(arrow.index + arrow[0].length).trim() || undefined,
    };
  }
  const tab = line.indexOf("\t");
  if (tab !== -1) {
    return { from: line.slice(0, tab).trim(), to: line.slice(tab + 1).trim() || undefined };
  }
  const comma = line.indexOf(",");
  if (comma !== -1) {
    return { from: line.slice(0, comma).trim(), to: line.slice(comma + 1).trim() || undefined };
  }
  return { from: line.trim() };
}

/**
 * Parse a pasted list: one mapping per line. Supports `from,to`, `from → to`,
 * `from -> to`, `from\tto`, or bare `from`. Blank lines and `#` comments are
 * ignored. Rows whose `from` is empty after trimming are dropped.
 */
export function parsePastedList(text: string): SourceRow[] {
  if (!text) return [];
  const rows: SourceRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (isSkippableLine(line)) continue;
    const row = splitPair(line);
    if (row.from) rows.push(row);
  }
  return rows;
}

/** Split a single CSV record into fields, honoring double-quoted fields with
 *  escaped ("") quotes. Only the first two fields are ever used. */
function parseCsvFields(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

/** True when a first data row looks like a header (its first cell names a
 *  source column: from/source/old/old url/from path, case-insensitive). */
function looksLikeHeader(fields: string[]): boolean {
  const first = (fields[0] ?? "").toLowerCase().replace(/[_\s]+/g, " ").trim();
  return (
    first === "from" ||
    first === "source" ||
    first === "old" ||
    first === "old url" ||
    first === "from path" ||
    first === "old path"
  );
}

/**
 * Parse a 2-column CSV (from,to). Tolerates a header row (dropped when the
 * first cell is a recognized source-column name), quoted fields, blank lines,
 * and `#` comment lines. Extra columns beyond the first two are ignored.
 */
export function parseCsv(text: string): SourceRow[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const rows: SourceRow[] = [];
  let sawFirst = false;
  for (const line of lines) {
    if (isSkippableLine(line)) continue;
    const fields = parseCsvFields(line);
    if (!sawFirst) {
      sawFirst = true;
      if (looksLikeHeader(fields)) continue; // drop the header row
    }
    const from = fields[0] ?? "";
    const to = fields[1];
    if (from) rows.push({ from, to: to || undefined });
  }
  return rows;
}

/* --------------------------------------------------------------- sitemap xml */

/**
 * Walk the parsed tree and collect every `<loc>` value as a string. A generic
 * walk (recurse into every object value / array element) handles both the
 * urlset (`{urlset:{url:[{loc}]}}`) and sitemapindex (`{sitemapindex:{sitemap:
 * [{loc}]}}`) wrapper shapes, plus the single-vs-array collapsing
 * fast-xml-parser does, without hard-coding each wrapper key. Only values under
 * a `loc` key are captured; `#text` is how the parser exposes a loc's text when
 * that element carried attributes.
 */
function collectLocs(node: unknown, out: string[], underLoc = false): void {
  if (node == null) return;
  if (typeof node === "string") {
    if (underLoc) {
      const t = node.trim();
      if (t) out.push(t);
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const n of node) collectLocs(n, out, underLoc);
    return;
  }
  if (typeof node === "object") {
    const rec = node as Record<string, unknown>;
    if (underLoc && typeof rec["#text"] === "string") {
      const t = rec["#text"].trim();
      if (t) out.push(t);
    }
    for (const [key, value] of Object.entries(rec)) {
      collectLocs(value, out, underLoc || key === "loc");
    }
  }
}

/** Turn a sitemap <loc> URL into a site-relative path when possible; keep the
 *  absolute URL if it's not a parseable http(s) URL (cross-origin is handled
 *  later by the same-origin guard when proposing). */
function locToPath(loc: string): string {
  try {
    const u = new URL(loc);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return u.pathname + u.search;
    }
    return loc;
  } catch {
    // Already a relative path (or garbage) — return as-is.
    return loc;
  }
}

/**
 * Extract every `<loc>` from a sitemap urlset (or sitemapindex) XML string and
 * return them as paths — origin stripped to site-relative where the loc is an
 * absolute http(s) URL, otherwise left as-is. Uses fast-xml-parser (never a
 * regex/DOM), so malformed markup can't hang or mis-parse. Returns [] on a
 * parse failure rather than throwing.
 */
export function parseSitemapXml(xml: string): string[] {
  if (!xml || !xml.trim()) return [];
  let parsed: unknown;
  try {
    const parser = new XMLParser({
      ignoreAttributes: true,
      trimValues: true,
      // Never coerce a numeric-looking slug/path to a number.
      parseTagValue: false,
    });
    parsed = parser.parse(xml);
  } catch {
    return [];
  }
  const locs: string[] = [];
  collectLocs(parsed, locs);
  // De-dupe while preserving order; convert to paths.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const loc of locs) {
    const path = locToPath(loc);
    if (!seen.has(path)) {
      seen.add(path);
      out.push(path);
    }
  }
  return out;
}

/* --------------------------------------------------------------- proposals */

/** Find the best same-origin target for `from` among knownTargets by
 *  pathSimilarity. Returns null when nothing clears the threshold. */
function bestSimilar(
  from: string,
  knownTargets: string[],
): { target: string; score: number } | null {
  let best: { target: string; score: number } | null = null;
  for (const target of knownTargets) {
    if (!isSameOriginPath(target)) continue;
    const score = pathSimilarity(from, target);
    if (score >= SIMILARITY_THRESHOLD && (!best || score > best.score)) {
      best = { target, score };
    }
  }
  return best;
}

/**
 * Turn raw source rows into reviewable proposals against the site's known
 * (published) targets. Per source, in order:
 *
 *  1. identity (from normalizes to to)         → skip-marked, conf 1.0
 *  2. explicit valid same-origin `to`          → exact, conf 1.0
 *  3. exact string match in knownTargets       → exact-existing, conf 1.0
 *  4. best fuzzy match ≥ threshold             → similar, conf = similarity
 *  5. nothing                                  → to:null (Gone / 410 candidate)
 *
 * `knownTargets` is the caller-supplied list of real destinations (published
 * page/entry routes + existing redirect targets). Targets that aren't
 * same-origin paths are ignored as match candidates.
 */
export function proposeMappings(
  sources: SourceRow[],
  knownTargets: string[],
): MappingProposal[] {
  const normalizedTargets = new Set(
    knownTargets.filter(isSameOriginPath).map((t) => normalizePath(t)),
  );

  return sources.map((src): MappingProposal => {
    const from = src.from;
    const to = src.to?.trim() || undefined;

    // 1. Identity — the old URL already equals the intended new URL.
    if (to && normalizePath(from) === normalizePath(to)) {
      return {
        from,
        to,
        matchType: "exact",
        confidence: 1,
        reason: "identity",
        note: "no redirect needed (identity)",
      };
    }

    // 2. Caller gave an explicit, valid, same-origin target.
    if (to) {
      if (isSameOriginPath(to)) {
        return { from, to, matchType: "exact", confidence: 1, reason: "exact-existing" };
      }
      // A supplied but off-origin target can't be used — fall through to
      // matching so we still try to find a real home, else Gone.
    }

    // 3. Exact match against a known published route.
    if (normalizedTargets.has(normalizePath(from))) {
      return {
        from,
        to: from,
        matchType: "exact",
        confidence: 1,
        reason: "exact-existing",
        note: "matches an existing route",
      };
    }

    // 4. Best fuzzy match among known routes.
    const similar = bestSimilar(from, knownTargets);
    if (similar) {
      return {
        from,
        to: similar.target,
        matchType: "exact",
        confidence: similar.score,
        reason: "similar",
        note: `closest existing route (${Math.round(similar.score * 100)}% match)`,
      };
    }

    // 5. No home — a Gone (410) candidate.
    return {
      from,
      to: null,
      matchType: "exact",
      confidence: to && !isSameOriginPath(to) ? 0 : 0.4,
      reason: "none-gone",
      note:
        to && !isSameOriginPath(to)
          ? "target was not a site-relative path — will 410 unless edited"
          : "no matching route found — will 410 (Gone) unless edited",
    };
  });
}

/**
 * Sort proposals lowest-confidence-first so the operator reviews the least
 * certain rows before committing. Stable-ish: ties keep input order via the
 * index fallback. Returns a new array (does not mutate the input).
 */
export function sortForReview(proposals: MappingProposal[]): MappingProposal[] {
  return proposals
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.confidence - b.p.confidence || a.i - b.i)
    .map(({ p }) => p);
}
