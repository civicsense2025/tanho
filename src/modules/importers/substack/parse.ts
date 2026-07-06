import { extractZip, baseName } from "../shared/zip";
import { parseCsvRows } from "../shared/csv";
import { normalizeSlug } from "../wxr/map";
import type { ParseIssue, Result } from "../shared/types";

/**
 * Substack's export shape (Settings → Exports → "Create a new export"). The .zip
 * carries one HTML file per post under `posts/` (filename like
 * `<postId>.<slug>.html`), a `posts.csv` metadata sheet keyed by `post_id`, and —
 * if the publication has any — an email-list CSV (`email_list.csv` /
 * `subscriber_emails.csv`, columns include `email` + a free-vs-paid flag).
 *
 * Substack's zips vary across export vintages, so parsing is deliberately
 * tolerant: a missing `posts.csv` falls back to deriving the title from the
 * filename and defaulting to published; a malformed CSV row becomes a
 * `ParseIssue`, never a throw.
 */
export type SubstackPost = {
  id: string;
  title: string;
  slug: string;
  html: string;
  status: "draft" | "published";
};

export type SubstackSubscriber = {
  email: string;
  name: string;
  /** True when the row carries an active/paid-subscription flag → grants a
   *  "member" person; false → a plain "subscriber". */
  paid: boolean;
};

export type ParsedSubstack = {
  posts: SubstackPost[];
  subscribers: SubstackSubscriber[];
  issues: ParseIssue[];
};

/** Server-side sanity cap on posts OR subscribers, independent of the client's
 *  raw file-size check — bounds the real cost driver (the number of DB writes
 *  the commit loops will do). Mirrors the Ghost/WXR importers' MAX_IMPORT_ROWS. */
export const MAX_IMPORT_ROWS = 20_000;

/** A post HTML entry lives at `posts/<something>.html` (never a nested dir). */
function isPostHtml(path: string): boolean {
  return /^posts\/[^/]+\.html$/i.test(path);
}

/** Substack's CSVs sit at the zip root; match by basename, case-insensitively. */
function isPostsCsv(path: string): boolean {
  return baseName(path).toLowerCase() === "posts.csv";
}

/** An email-list CSV — Substack has shipped a few names for it across vintages
 *  (`email_list.csv`, `subscriber_emails.csv`, `subscribers.csv`, `signup_emails.csv`).
 *  We keep the filename heuristic loose and confirm by header (an `email` column)
 *  in the parse below, so a rename doesn't silently drop subscribers. */
function looksLikeEmailCsv(path: string): boolean {
  const name = baseName(path).toLowerCase();
  if (name === "posts.csv") return false;
  return name.endsWith(".csv") && (name.includes("email") || name.includes("subscriber") || name.includes("signup"));
}

/**
 * Derive Substack's `post_id` from a `posts/` HTML filename. Substack names them
 * `<postId>.<slug>.html` where postId is the leading numeric segment (e.g.
 * `123456.my-first-post.html` → id `123456`, stem `my-first-post`). Older
 * exports used a bare `<slug>.html`; then there's no numeric id and the whole
 * stem is treated as both the lookup key and the slug source.
 */
function parsePostFilename(path: string): { id: string; stem: string } {
  const file = baseName(path).replace(/\.html$/i, "");
  const dot = file.indexOf(".");
  if (dot > 0 && /^\d+$/.test(file.slice(0, dot))) {
    return { id: file.slice(0, dot), stem: file.slice(dot + 1) };
  }
  return { id: file, stem: file };
}

/** Truthy-string test for CSV boolean-ish columns ("true"/"1"/"yes"/"paid"). */
function isTruthy(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "t" || s === "paid" || s === "active";
}

/** Case-insensitive column lookup on a header-keyed CSV row. */
function col(row: Record<string, string>, ...names: string[]): string {
  const lowered: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) lowered[k.trim().toLowerCase()] = v;
  for (const n of names) {
    const hit = lowered[n.toLowerCase()];
    if (hit !== undefined && hit !== "") return hit;
  }
  return "";
}

/**
 * Parse a Substack export zip into posts + subscribers + issues. Never throws:
 * a bomb/garbage zip returns `{ok:false}`; a malformed row returns an issue.
 */
export async function parseSubstack(file: File): Promise<Result<ParsedSubstack>> {
  const extracted = await extractZip(file, {
    filter: (p) => isPostHtml(p) || isPostsCsv(p) || looksLikeEmailCsv(p),
  });
  if (!extracted.ok) return extracted;

  const issues: ParseIssue[] = [];
  const { entries, skipped } = extracted.data!;
  for (const s of skipped) {
    issues.push({ kind: "entry-too-large", detail: `"${s}" was too large and skipped` });
  }

  // ── posts.csv metadata, indexed by post_id ───────────────────────────────
  const csvEntry = entries.find((e) => isPostsCsv(e.path));
  const metaById = new Map<string, Record<string, string>>();
  if (csvEntry) {
    let rows: Array<Record<string, string>> = [];
    try {
      rows = parseCsvRows(csvEntry.text);
    } catch (err) {
      issues.push({ kind: "posts-csv-unreadable", detail: `posts.csv could not be parsed: ${err instanceof Error ? err.message : String(err)}` });
    }
    for (const row of rows) {
      const id = col(row, "post_id", "id");
      if (id) metaById.set(id, row);
    }
  }

  // ── one post per posts/*.html ────────────────────────────────────────────
  const postEntries = entries.filter((e) => isPostHtml(e.path));
  if (postEntries.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `This export has ${postEntries.length} posts — the limit is ${MAX_IMPORT_ROWS} per import.` };
  }

  const posts: SubstackPost[] = [];
  for (const entry of postEntries) {
    try {
      const { id, stem } = parsePostFilename(entry.path);
      const meta = metaById.get(id) ?? metaById.get(stem);

      const title = (meta ? col(meta, "title") : "").trim() || stem.replace(/[-_]+/g, " ").trim() || `Post ${id}`;
      const csvSlug = meta ? col(meta, "slug", "post_name") : "";

      // Substack marks published state via `is_published` (true/false); some
      // exports instead carry a `published`/`status` column. Absent any signal
      // (e.g. no posts.csv), default to published — a Substack export is almost
      // always of live posts, and a draft is the rare case.
      let status: SubstackPost["status"] = "published";
      if (meta) {
        const isPub = col(meta, "is_published", "published", "status");
        if (isPub && !isTruthy(isPub) && isPub.trim().toLowerCase() !== "published") status = "draft";
      }

      const { slug, changed } = normalizeSlug(csvSlug || stem, title, id);
      if (changed) issues.push({ kind: "slug-normalized", detail: `"${title}" slug normalized to "${slug}"` });

      posts.push({ id, title, slug, html: entry.text, status });
    } catch (err) {
      issues.push({ kind: "post-unreadable", detail: `"${entry.path}" could not be read: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // ── subscribers (optional email-list CSV) ────────────────────────────────
  const subscribers: SubstackSubscriber[] = [];
  const emailEntry = entries.find(
    (e) => looksLikeEmailCsv(e.path) && /(^|,)\s*"?email"?\s*(,|$)/im.test((e.text.split(/\r?\n/, 1)[0] ?? "")),
  );
  if (emailEntry) {
    let rows: Array<Record<string, string>> = [];
    try {
      rows = parseCsvRows(emailEntry.text);
    } catch (err) {
      issues.push({ kind: "email-csv-unreadable", detail: `${baseName(emailEntry.path)} could not be parsed: ${err instanceof Error ? err.message : String(err)}` });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return { ok: false, error: `This export has ${rows.length} subscribers — the limit is ${MAX_IMPORT_ROWS} per import.` };
    }
    for (const row of rows) {
      try {
        const email = col(row, "email", "email_address").trim();
        if (!email) {
          issues.push({ kind: "subscriber-no-email", detail: "A subscriber row had no email and was skipped" });
          continue;
        }
        const name = col(row, "name", "full_name", "display_name").trim();
        // Substack's paid signal varies: `active_subscription` (true/false),
        // a `type`/`membership`/`plan` column of "paid", or a `paying` flag.
        const paid =
          isTruthy(col(row, "active_subscription", "paying", "is_paid")) ||
          /paid|premium|comp|founding/i.test(col(row, "type", "membership", "plan", "tier", "subscription_type"));
        subscribers.push({ email, name, paid });
      } catch (err) {
        issues.push({ kind: "subscriber-unreadable", detail: `A subscriber row could not be read: ${err instanceof Error ? err.message : String(err)}` });
      }
    }
  }

  return { ok: true, data: { posts, subscribers, issues } };
}
