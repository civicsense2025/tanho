/**
 * Ghost's JSON content export shape (Settings → Advanced → Import/Export).
 * IDs are relative to the file only, not real database ids — see Ghost's own
 * migration docs (docs.ghost.org/migration/custom).
 */
export type GhostPost = {
  id: string;
  title: string;
  slug: string;
  html?: string;
  lexical?: string;
  status: "published" | "draft";
  visibility: "public" | "members" | "paid";
  feature_image?: string | null;
  published_at?: string | null;
  custom_excerpt?: string | null;
};

export type GhostTag = { id: string; name: string; slug: string };
export type GhostPostTag = { post_id: string; tag_id: string };
export type GhostUser = { id: string; name: string; slug: string; email: string };
export type GhostPostAuthor = { post_id: string; author_id: string };

export type GhostContentExport = {
  meta: { exported_on: number; version: string };
  data: {
    posts: GhostPost[];
    tags?: GhostTag[];
    posts_tags?: GhostPostTag[];
    users?: GhostUser[];
    posts_authors?: GhostPostAuthor[];
  };
};

export type ParseIssue = { kind: string; detail: string };

/** Server-side sanity cap on posts OR members, independent of the client's
 *  file-size check (which only bounds raw upload bytes, not a maliciously
 *  crafted parsed structure) — bounds the actual cost driver, the number of
 *  DB writes commitGhostImport's loops will do. Comfortably above any real
 *  single-site Ghost export (thousands of rows, not tens of thousands). */
const MAX_IMPORT_ROWS = 20_000;

export type ParsedGhostContent =
  | { ok: true; posts: GhostPost[]; tags: GhostTag[]; issues: ParseIssue[] }
  | { ok: false; error: string };

/**
 * Parse Ghost's content-export JSON (either the bare `{meta,data}` shape or
 * the `{db: [{meta,data}]}` wrapper some Ghost versions use). Doesn't throw
 * on a malformed individual post — those surface as `issues`, so one bad row
 * never aborts the whole import.
 */
export function parseGhostContentExport(raw: unknown): ParsedGhostContent {
  let root: unknown = raw;
  if (root && typeof root === "object" && "db" in root) {
    const db = (root as { db: unknown }).db;
    if (Array.isArray(db) && db.length > 0) root = db[0];
  }
  if (!root || typeof root !== "object" || !("data" in root)) {
    return { ok: false, error: "Not a recognizable Ghost export: missing a top-level \"data\" object" };
  }
  const data = (root as { data: unknown }).data;
  if (!data || typeof data !== "object" || !("posts" in data) || !Array.isArray((data as { posts: unknown }).posts)) {
    return { ok: false, error: "Not a recognizable Ghost export: missing data.posts" };
  }

  const rawPosts = (data as { posts: unknown[] }).posts;
  if (rawPosts.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `This export has ${rawPosts.length} posts — the limit is ${MAX_IMPORT_ROWS} per import.` };
  }
  const issues: ParseIssue[] = [];
  const posts: GhostPost[] = [];
  for (const p of rawPosts) {
    if (!p || typeof p !== "object") {
      issues.push({ kind: "malformed-post", detail: "A post entry was not an object; skipped" });
      continue;
    }
    const post = p as Record<string, unknown>;
    if (typeof post.id !== "string" || typeof post.title !== "string" || typeof post.slug !== "string") {
      issues.push({ kind: "malformed-post", detail: `Post missing id/title/slug (got id=${String(post.id)}); skipped` });
      continue;
    }
    const visibility = post.visibility;
    const safeVisibility: GhostPost["visibility"] =
      visibility === "public" || visibility === "members" || visibility === "paid" ? visibility : "public";
    if (visibility !== safeVisibility) {
      issues.push({
        kind: "unknown-visibility",
        detail: `Post "${post.title}" had unrecognized visibility "${String(visibility)}"; treated as public`,
      });
    }
    posts.push({
      id: post.id,
      title: post.title,
      slug: post.slug,
      html: typeof post.html === "string" ? post.html : undefined,
      lexical: typeof post.lexical === "string" ? post.lexical : undefined,
      status: post.status === "draft" ? "draft" : "published",
      visibility: safeVisibility,
      feature_image: typeof post.feature_image === "string" ? post.feature_image : null,
      published_at: typeof post.published_at === "string" ? post.published_at : null,
      custom_excerpt: typeof post.custom_excerpt === "string" ? post.custom_excerpt : null,
    });
  }

  const rawTags: unknown = (data as Record<string, unknown>).tags;
  const tags: GhostTag[] = Array.isArray(rawTags)
    ? rawTags.filter(
        (t): t is GhostTag =>
          !!t && typeof t === "object" && typeof (t as GhostTag).id === "string" && typeof (t as GhostTag).name === "string",
      )
    : [];

  return { ok: true, posts, tags, issues };
}

/** One row from Ghost's Members CSV export (Members area → export). */
export type GhostMember = {
  id: string;
  email: string;
  name: string;
  note: string;
  subscribed_to_emails: boolean;
  complimentary_plan: boolean;
  stripe_customer_id: string;
  created_at: string;
  deleted_at: string;
};

export type ParsedGhostMembers =
  | { ok: true; members: GhostMember[]; issues: ParseIssue[] }
  | { ok: false; error: string };

const EXPECTED_HEADERS = [
  "id",
  "email",
  "name",
  "note",
  "subscribed_to_emails",
  "complimentary_plan",
  "stripe_customer_id",
  "created_at",
  "deleted_at",
];

/** Split one CSV line into fields, honoring RFC 4180 quoting (a quoted
 *  field may contain commas, newlines are handled by the caller joining
 *  continuation lines before this runs on a complete record). */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      fields.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  fields.push(field);
  return fields;
}

/** Join raw CSV text into logical records — a quoted field may itself
 *  contain a literal newline, which a naive line-by-line split would
 *  break mid-record. */
function toRecords(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (c === '"') inQuotes = !inQuotes;
    if (c === "\n" && !inQuotes) {
      if (current.length > 0) rows.push(splitCsvLine(current));
      current = "";
      continue;
    }
    current += c;
  }
  if (current.length > 0) rows.push(splitCsvLine(current));
  return rows;
}

/**
 * Parse Ghost's Members CSV export. Tolerant of column reordering (matches
 * by header name, not position) and skips a row missing an email (can't be
 * identified) rather than aborting the whole import.
 */
export function parseGhostMembersCsv(text: string): ParsedGhostMembers {
  const records = toRecords(text);
  if (records.length === 0) return { ok: false, error: "Empty CSV file" };
  if (records.length - 1 > MAX_IMPORT_ROWS) {
    return { ok: false, error: `This export has ${records.length - 1} members — the limit is ${MAX_IMPORT_ROWS} per import.` };
  }
  const headers = records[0]!.map((h) => h.trim());
  const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length === EXPECTED_HEADERS.length) {
    return { ok: false, error: "Not a recognizable Ghost Members export: no matching columns found" };
  }

  const issues: ParseIssue[] = [];
  const members: GhostMember[] = [];
  let deletedSkipped = 0;
  const col = (row: string[], name: string): string => {
    const idx = headers.indexOf(name);
    return idx === -1 ? "" : (row[idx] ?? "");
  };

  for (const row of records.slice(1)) {
    const email = col(row, "email").trim();
    if (!email) {
      issues.push({ kind: "missing-email", detail: `Row for "${col(row, "name") || "(unnamed)"}" has no email; skipped` });
      continue;
    }
    // Ghost soft-deletes members: a non-empty `deleted_at` means the member was
    // removed from the publication. Don't resurrect them as people on import —
    // skip and report the count on the receipt (one issue, not one per row).
    if (col(row, "deleted_at").trim()) {
      deletedSkipped++;
      continue;
    }
    members.push({
      id: col(row, "id"),
      email,
      name: col(row, "name"),
      note: col(row, "note"),
      subscribed_to_emails: col(row, "subscribed_to_emails").trim().toLowerCase() === "true",
      complimentary_plan: col(row, "complimentary_plan").trim().toLowerCase() === "true",
      stripe_customer_id: col(row, "stripe_customer_id"),
      created_at: col(row, "created_at"),
      deleted_at: col(row, "deleted_at"),
    });
  }

  if (deletedSkipped > 0) {
    issues.push({
      kind: "deleted-member",
      detail: `${deletedSkipped} deleted member${deletedSkipped === 1 ? "" : "s"} (with a deleted_at date) skipped`,
    });
  }

  return { ok: true, members, issues };
}
