import { sanitizeRichHtml } from "@/lib/sanitize";
import type { SearchResult } from "../query";
import styles from "./SearchResults.module.css";

const TYPE_LABEL: Record<SearchResult["type"], string> = {
  page: "Page",
  entry: "Guide",
  product: "Product",
  content: "Content",
};

/**
 * A locked result still shows its title/path/snippet — same convention as
 * postlist's `locked` lock glyph (blocks/postlist/Render.tsx): the reader
 * sees WHAT exists, gated visually, and finds out they need to sign in or
 * upgrade by clicking through, not by search silently omitting the hit.
 * `snippet` came from the adapter's own <mark>-wrapped highlight (fts5.ts's
 * snippet()/postgres-tsvector.ts's ts_headline) — sanitized here regardless,
 * same "never trust an HTML-shaped string without the allowlist" rule every
 * other HTML render in this codebase follows (lib/sanitize.ts).
 */
export function SearchResults({ results, query }: { results: SearchResult[]; query: string }) {
  if (!query.trim()) {
    return <p className={styles.empty}>Enter a search term above.</p>;
  }
  if (results.length === 0) {
    return <p className={styles.empty}>No results for &ldquo;{query}&rdquo;.</p>;
  }

  return (
    <div className={styles.list}>
      {results.map((r) => (
        <a key={`${r.type}:${r.path}`} href={r.path} className={styles.row}>
          <span className={styles.titleLine}>
            {r.locked ? (
              <span className={styles.lock} aria-label="Members only">
                ▸
              </span>
            ) : null}
            <span className={styles.title}>{r.title || r.path}</span>
            <span className={styles.type}>{TYPE_LABEL[r.type]}</span>
          </span>
          {r.snippet ? (
            <span className={styles.snippet} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(r.snippet) }} />
          ) : null}
        </a>
      ))}
    </div>
  );
}
