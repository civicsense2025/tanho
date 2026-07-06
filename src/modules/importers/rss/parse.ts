import { XMLParser } from "fast-xml-parser";
import { normalizeSlug } from "../wxr/map";
import type { ParseIssue } from "../shared/types";

/**
 * RSS 2.0 / Atom feed shape. Both formats are XML but structured differently:
 *  - RSS 2.0: `rss.channel.item[]`, each item has `title`, `link` (a bare URL),
 *    `content:encoded` OR `description` for the body, `pubDate`, `guid`.
 *  - Atom: `feed.entry[]`, each entry has `title`, `content` OR `summary`,
 *    one or more `link` elements (the alternate-rel one is the permalink),
 *    `updated`/`published`, and `id`.
 *
 * Both normalize to the same `FeedItem`. Mirrors the WXR/Ghost importers'
 * contract exactly: a structurally-unrecognizable document returns
 * `{ok:false,error}`, but a malformed individual item surfaces as an `issue`
 * and is skipped — one bad row never aborts the whole import.
 */
export type FeedItem = {
  title: string;
  /** Original absolute permalink — used to build an exact 301 redirect. */
  link: string;
  /** The post body HTML (content:encoded / description / Atom content|summary). */
  contentHtml: string;
  /** Stable per-item id (guid / Atom id / link) — for slug derivation fallback. */
  guid: string;
  /** URL slug derived from the link pathname (or guid/title); already normalized. */
  slug: string;
};

export type ParsedFeed = { items: FeedItem[]; issues: ParseIssue[] };

/** Server-side sanity cap on total items — bounds the DB-write cost the commit
 *  loop incurs, independent of the raw fetch-byte / upload check. Mirrors the
 *  WXR/Ghost/Substack importers' MAX_IMPORT_ROWS. */
export const MAX_IMPORT_ROWS = 20_000;

/** The `{ok}` envelope shared by every importer parse step. */
type Result<T> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Read a fast-xml-parser node as a string, tolerating the three shapes a text
 * node can take under our config: a CDATA node (`{__cdata}`), a
 * plain-text-with-attributes node (`{#text}`), or a bare string. Anything else
 * (missing, object without text) → "". Mirrors wxr/parse.ts's `str`.
 */
function str(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  // Our `isArray` config forces `<link>` into an array (to handle Atom's
  // multiple links); unwrap a one-element array so RSS's single <link>/<guid>
  // reads as a plain string rather than "".
  if (Array.isArray(node)) return node.length > 0 ? str(node[0]) : "";
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

/** Coerce a value the parser may have collapsed to a single object into an array. */
function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  // Keep EVERYTHING as strings — a numeric-looking guid or id must never
  // silently become a JS number and break string ops.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  // Force these to always be arrays even when a single element exists, so
  // mapping code never has to branch on "array or lone object".
  isArray: (name) => name === "item" || name === "entry" || name === "link",
});

/** Derive a slug from the link pathname (preferred), falling back through the
 *  guid then the title, via the shared WXR normalizer. `link` is the source's
 *  absolute permalink; its last path segment is the most human-meaningful slug
 *  source. */
function slugForItem(link: string, guid: string, title: string): string {
  let fromPath = "";
  if (link) {
    try {
      const segments = new URL(link).pathname.split("/").filter(Boolean);
      fromPath = segments[segments.length - 1] ?? "";
    } catch {
      // link wasn't an absolute URL — fall through to guid/title.
    }
  }
  const { slug } = normalizeSlug(fromPath || guid, title, guid);
  return slug;
}

/**
 * Pick an Atom entry's permalink: the `<link rel="alternate">` href, else the
 * first `<link>` with an href, else a bare `<link>` string. Atom entries carry
 * several links (self/alternate/enclosure); the alternate is the human page.
 */
function atomLink(rawLinks: unknown): string {
  const links = asArray(rawLinks);
  // Prefer rel="alternate" (or a link with no rel, which defaults to alternate).
  for (const l of links) {
    const rel = attr(l, "rel");
    const href = attr(l, "href");
    if (href && (rel === "alternate" || rel === "")) return href;
  }
  // Otherwise the first link with any href.
  for (const l of links) {
    const href = attr(l, "href");
    if (href) return href;
  }
  // Or a bare string link (rare, but tolerate it).
  for (const l of links) {
    const s = str(l);
    if (s) return s;
  }
  return "";
}

function normalizeRssItem(raw: Record<string, unknown>): FeedItem {
  const title = str(raw.title);
  const link = str(raw.link);
  // content:encoded is the full body; description is the fallback (may be an
  // excerpt, but it's the only body some feeds carry).
  const contentHtml = str(raw["content:encoded"]) || str(raw.description);
  // <guid> may be a bare string or an object (isPermaLink attribute + #text).
  const guid = str(raw.guid) || link;
  return { title, link, contentHtml, guid, slug: slugForItem(link, guid, title) };
}

function normalizeAtomEntry(raw: Record<string, unknown>): FeedItem {
  const title = str(raw.title);
  const link = atomLink(raw.link);
  const contentHtml = str(raw.content) || str(raw.summary);
  const guid = str(raw.id) || link;
  return { title, link, contentHtml, guid, slug: slugForItem(link, guid, title) };
}

/**
 * Parse an RSS 2.0 or Atom feed string. Detects format by which root key
 * exists (`rss` → RSS 2.0, `feed` → Atom). Returns `{ok:false,error}` only for
 * a structurally-unrecognizable document; a malformed individual item surfaces
 * as an `issue` and is skipped.
 */
export function parseFeed(xml: string): Result<ParsedFeed> {
  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (err) {
    return { ok: false, error: `Not a recognizable RSS/Atom feed: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Not a recognizable RSS/Atom feed" };
  }

  const root = parsed as Record<string, unknown>;
  const issues: ParseIssue[] = [];
  const items: FeedItem[] = [];

  if ("rss" in root) {
    // ── RSS 2.0 ──────────────────────────────────────────────────────────
    const channel = (root.rss as { channel?: unknown } | undefined)?.channel;
    if (!channel || typeof channel !== "object") {
      return { ok: false, error: 'Not a recognizable RSS feed: missing "rss.channel"' };
    }
    const rawItems = asArray((channel as Record<string, unknown>).item);
    if (rawItems.length > MAX_IMPORT_ROWS) {
      return { ok: false, error: `This feed has ${rawItems.length} items — the limit is ${MAX_IMPORT_ROWS} per import.` };
    }
    for (const raw of rawItems) {
      if (!raw || typeof raw !== "object") {
        issues.push({ kind: "malformed-item", detail: "An <item> was not an object; skipped" });
        continue;
      }
      const item = normalizeRssItem(raw as Record<string, unknown>);
      if (!item.title && !item.contentHtml) {
        issues.push({ kind: "malformed-item", detail: "An <item> had no title or content; skipped" });
        continue;
      }
      items.push(item);
    }
    return { ok: true, data: { items, issues } };
  }

  if ("feed" in root) {
    // ── Atom ─────────────────────────────────────────────────────────────
    const feed = root.feed;
    if (!feed || typeof feed !== "object") {
      return { ok: false, error: 'Not a recognizable Atom feed: missing "feed"' };
    }
    const rawEntries = asArray((feed as Record<string, unknown>).entry);
    if (rawEntries.length > MAX_IMPORT_ROWS) {
      return { ok: false, error: `This feed has ${rawEntries.length} entries — the limit is ${MAX_IMPORT_ROWS} per import.` };
    }
    for (const raw of rawEntries) {
      if (!raw || typeof raw !== "object") {
        issues.push({ kind: "malformed-item", detail: "An <entry> was not an object; skipped" });
        continue;
      }
      const item = normalizeAtomEntry(raw as Record<string, unknown>);
      if (!item.title && !item.contentHtml) {
        issues.push({ kind: "malformed-item", detail: "An <entry> had no title or content; skipped" });
        continue;
      }
      items.push(item);
    }
    return { ok: true, data: { items, issues } };
  }

  return { ok: false, error: 'Not a recognizable feed: no "rss" or "feed" root element' };
}
