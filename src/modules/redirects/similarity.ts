import { normalizePath } from "./validation";

/**
 * Path similarity, 0..1, for the bulk-mapping "did this old URL just move?"
 * heuristic. Pure, dependency-free (the repo has NO string-similarity lib, and
 * we don't add one): a normalized Levenshtein edit distance turned into a
 * similarity ratio, blended with a segment-overlap signal so two paths that
 * share most of their slug segments score high even when a middle segment
 * changed (e.g. /blog/2020/hello vs /posts/2020/hello).
 *
 * Both inputs are run through normalizePath first (strip query/hash, collapse
 * slashes, drop trailing slash, lowercase) so casing/trailing-slash noise never
 * lowers a score — those never distinguish two real URLs here.
 */

/** Classic Levenshtein edit distance between two strings (O(a*b) space-optimized). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Single rolling row — only the previous row is needed.
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}

/** Character-level similarity: 1 - editDistance/maxLen. 1 for identical. */
function charSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/** Split a normalized path into non-empty slug segments. */
function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/**
 * Segment-overlap similarity: |intersection| / |union| of the two paths' slug
 * segments (Jaccard). Catches "same page, reshuffled route" where the raw
 * character diff is large but the meaningful slug is shared.
 */
function segmentSimilarity(a: string, b: string): number {
  const sa = new Set(segments(a));
  const sb = new Set(segments(b));
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const s of sa) if (sb.has(s)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 1 : inter / union;
}

/**
 * Normalized path similarity in [0,1]. 1.0 iff the paths normalize equal.
 * Blends character-level and segment-level signals (weighted toward the raw
 * character edit distance, which is the stronger "typo / minor rename" signal)
 * so a shared final slug lifts the score without letting segment overlap alone
 * declare two clearly-different URLs a match.
 */
export function pathSimilarity(a: string, b: string): number {
  const na = normalizePath(a);
  const nb = normalizePath(b);
  if (na === nb) return 1;

  const chars = charSimilarity(na, nb);
  const segs = segmentSimilarity(na, nb);
  // The segment signal only LIFTS a score (a shared slug makes a moved route
  // score higher); it must never PENALIZE a strong character match — e.g. a
  // single-segment typo (/about-us vs /about-uss) has zero segment overlap but
  // is clearly the same page. So take the better of the raw char similarity and
  // the segment-blended score.
  const blended = 0.7 * chars + 0.3 * segs;
  const score = Math.max(chars, blended);
  // Clamp defensively against any float drift.
  return Math.max(0, Math.min(1, score));
}
