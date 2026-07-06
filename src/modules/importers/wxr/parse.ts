import { XMLParser } from "fast-xml-parser";

/**
 * WordPress WXR (WordPress eXtended RSS) export shape — the format both
 * WordPress ("Tools → Export") and Squarespace ("Settings → Import & Export
 * → Export → WordPress") emit. It's RSS 2.0 with WordPress/Dublin-Core
 * namespaces (`wp:`, `content:`, `excerpt:`, `dc:`). IDs and slugs in the
 * file are the source site's, not OYS's — the same "relative to the file"
 * caveat the Ghost importer's parse.ts documents.
 *
 * Mirrors the Ghost importer's parse.ts contract exactly: a malformed
 * individual `<item>` surfaces as an `issue`, never a throw, so one bad row
 * can't abort the whole import.
 */
export type WxrCategory = {
  /** WXR uses "category" and "post_tag"; other custom taxonomies are possible. */
  domain: string;
  /** URL slug (@_nicename). */
  nicename: string;
  /** Display name (text/CDATA). */
  name: string;
};

export type WxrComment = {
  id: string;
  author: string;
  authorEmail: string;
  /** Comment body (CDATA) — may be html or plain text. */
  content: string;
  /** Raw WXR date string (`wp:comment_date_gmt` preferred), pre-normalization. */
  date: string;
  /** wp:comment_approved === "1". */
  approved: boolean;
  /** wp:comment_parent ("0" = top-level). */
  parentId: string;
};

export type WxrItem = {
  title: string;
  /** Original absolute permalink (`<link>`) — used to build an exact 301 redirect. */
  link: string;
  /** wp:post_type: "post" | "page" | "attachment" | "nav_menu_item" | <cpt>. */
  postType: string;
  /** wp:status: "publish" | "draft" | "private" | "pending" | "future" | "trash" | ... */
  status: string;
  /** wp:post_name — may be empty or percent-encoded; normalized downstream. */
  slug: string;
  /** content:encoded (CDATA) — the post body html. */
  contentHtml: string;
  /** excerpt:encoded (CDATA). */
  excerpt: string;
  /** dc:creator — author login/name. */
  creator: string;
  /** wp:post_id — foreign-file id, for comment linkage + attachment resolution. */
  postId: string;
  /** wp:post_parent. */
  parentId: string;
  /** wp:menu_order — sort order for pages/entries. */
  menuOrder: string;
  categories: WxrCategory[];
  comments: WxrComment[];
  /** wp:postmeta key/value pairs (drives CPT field derivation + featured-image lookup). */
  postmeta: Array<{ key: string; value: string }>;
  /** wp:attachment_url — only present on post_type=attachment items. */
  attachmentUrl: string;
};

export type WxrAuthor = {
  login: string;
  email: string;
  displayName: string;
};

export type ParseIssue = { kind: string; detail: string };

/** Server-side sanity cap on total items — bounds the DB-write cost the
 *  commit loop incurs, independent of the client's raw upload-byte check.
 *  Mirrors the Ghost importer's MAX_IMPORT_ROWS. */
const MAX_IMPORT_ROWS = 20_000;

/** Comment volume can dwarf post count (a single popular WP site can carry
 *  100k+ comments). Capped separately so a comment-heavy export still imports
 *  its posts; over the cap, comment import is skipped with one issue. */
export const MAX_COMMENTS = 50_000;

export type ParsedWxr =
  | { ok: true; items: WxrItem[]; authors: WxrAuthor[]; issues: ParseIssue[] }
  | { ok: false; error: string };

/** Read a fast-xml-parser node as a string, tolerating the three shapes a
 *  WXR text node can take under our parser config: a CDATA node
 *  (`{__cdata}`), a plain-text-with-attributes node (`{#text}`), or a bare
 *  string. Anything else (missing, object without text) → "". */
function str(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.__cdata === "string") return o.__cdata;
    if (typeof o["#text"] === "string") return o["#text"];
  }
  return "";
}

/** Read an attribute (parser config prefixes attributes with "@_"). */
function attr(node: unknown, name: string): string {
  if (node && typeof node === "object") {
    const v = (node as Record<string, unknown>)[`@_${name}`];
    if (typeof v === "string") return v;
  }
  return "";
}

/** Coerce a value the parser may have collapsed to a single object into an
 *  array. `isArray` covers the tags we know, but a namespaced child not in
 *  that list (defensive) is still normalized here. */
function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  // Keep EVERYTHING as strings: a numeric-looking slug ("2024"), post id, or
  // comment-parent must never silently become a JS number and break string ops.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  // Force these to always be arrays even when a single element exists, so
  // mapping code never has to branch on "array or lone object".
  isArray: (name) =>
    name === "item" ||
    name === "category" ||
    name === "wp:comment" ||
    name === "wp:postmeta" ||
    name === "wp:commentmeta" ||
    name === "wp:author",
});

function normalizeComment(raw: Record<string, unknown>): WxrComment {
  // Prefer the GMT date (stable, tz-independent); fall back to local.
  const dateGmt = str(raw["wp:comment_date_gmt"]);
  const dateLocal = str(raw["wp:comment_date"]);
  return {
    id: str(raw["wp:comment_id"]),
    author: str(raw["wp:comment_author"]),
    authorEmail: str(raw["wp:comment_author_email"]),
    content: str(raw["wp:comment_content"]),
    date: dateGmt || dateLocal,
    approved: str(raw["wp:comment_approved"]) === "1",
    parentId: str(raw["wp:comment_parent"]) || "0",
  };
}

function normalizeItem(raw: Record<string, unknown>): WxrItem {
  const categories: WxrCategory[] = asArray(raw.category).map((c) => ({
    domain: attr(c, "domain"),
    nicename: attr(c, "nicename"),
    name: str(c),
  }));
  const comments: WxrComment[] = asArray(raw["wp:comment"]).map((c) =>
    normalizeComment(c as Record<string, unknown>),
  );
  const postmeta = asArray(raw["wp:postmeta"]).map((m) => {
    const mm = m as Record<string, unknown>;
    return { key: str(mm["wp:meta_key"]), value: str(mm["wp:meta_value"]) };
  });
  return {
    title: str(raw.title),
    link: str(raw.link),
    postType: str(raw["wp:post_type"]),
    status: str(raw["wp:status"]),
    slug: str(raw["wp:post_name"]),
    contentHtml: str(raw["content:encoded"]),
    excerpt: str(raw["excerpt:encoded"]),
    creator: str(raw["dc:creator"]),
    postId: str(raw["wp:post_id"]),
    parentId: str(raw["wp:post_parent"]),
    menuOrder: str(raw["wp:menu_order"]),
    categories,
    comments,
    postmeta,
    attachmentUrl: str(raw["wp:attachment_url"]),
  };
}

/**
 * Parse a WordPress WXR export string. Returns `{ok:false,error}` only for a
 * structurally unrecognizable file (not XML, or no `rss.channel.item`); a
 * malformed individual item surfaces as an `issue` and is skipped, matching
 * the Ghost importer's "one bad row never aborts the import" contract.
 */
export function parseWxr(xml: string): ParsedWxr {
  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (err) {
    return { ok: false, error: `Not a recognizable WordPress/WXR export: ${err instanceof Error ? err.message : String(err)}` };
  }

  const channel =
    parsed && typeof parsed === "object" && "rss" in parsed
      ? (parsed as { rss?: { channel?: unknown } }).rss?.channel
      : undefined;
  if (!channel || typeof channel !== "object") {
    return { ok: false, error: 'Not a recognizable WXR export: missing "rss.channel"' };
  }

  const rawItems = (channel as Record<string, unknown>).item;
  if (!Array.isArray(rawItems)) {
    return { ok: false, error: "Not a recognizable WXR export: missing rss.channel.item" };
  }
  if (rawItems.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `This export has ${rawItems.length} items — the limit is ${MAX_IMPORT_ROWS} per import.` };
  }

  const issues: ParseIssue[] = [];
  const items: WxrItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") {
      issues.push({ kind: "malformed-item", detail: "An <item> was not an object; skipped" });
      continue;
    }
    const item = normalizeItem(raw as Record<string, unknown>);
    // An item with neither a post type nor a title is not something we can
    // meaningfully route or label — skip it, note it, keep going.
    if (!item.postType && !item.title) {
      issues.push({ kind: "malformed-item", detail: "An <item> had no wp:post_type or title; skipped" });
      continue;
    }
    items.push(item);
  }

  const authors: WxrAuthor[] = asArray((channel as Record<string, unknown>)["wp:author"])
    .map((a) => {
      const aa = a as Record<string, unknown>;
      return {
        login: str(aa["wp:author_login"]),
        email: str(aa["wp:author_email"]),
        displayName: str(aa["wp:author_display_name"]),
      };
    })
    .filter((a) => a.login || a.email);

  return { ok: true, items, authors, issues };
}
