import type { Metadata } from "next";
import { getViewer } from "@/modules/people/viewer";
import { searchPublished } from "@/modules/search/query";
import { SearchResults } from "@/modules/search/public/SearchResults";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: false } };

function firstParam(raw: string | string[] | undefined): string {
  return (Array.isArray(raw) ? raw[0] : raw) ?? "";
}

/**
 * Search results page. Gate re-checking (searchPublished) is what makes this
 * safe to render publicly: a hit's stored gate was resolved at INDEX time
 * (see adapters/types.ts's SearchDocument doc comment) but is re-verified
 * here against the REAL, current viewer before deciding locked/unlocked —
 * never trusting the cached value alone. `robots: noindex` — a query-driven
 * results page has no canonical content of its own to rank; real pages/
 * entries/products already have their own indexable public pages.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = firstParam(sp.q).slice(0, 200);
  const viewer = query.trim() ? await getViewer() : null;
  const results = query.trim() ? await searchPublished(query, viewer) : [];

  return (
    <main
      style={{
        maxWidth: "40rem",
        margin: "0 auto",
        padding: "var(--space-10) var(--gutter) var(--space-12)",
      }}
    >
      <h1 style={{ fontSize: "var(--text-h1)", marginBottom: "var(--space-6)" }}>Search</h1>
      <form
        action="/search"
        method="get"
        style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}
      >
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search the site…"
          aria-label="Search the site"
          style={{
            flex: 1,
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: "var(--text-base)",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "var(--space-3) var(--space-5)",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: "var(--accent)",
            color: "var(--text-on-accent)",
            fontSize: "var(--text-base)",
            fontWeight: "var(--weight-medium)",
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>
      <SearchResults results={results} query={query} />
    </main>
  );
}
