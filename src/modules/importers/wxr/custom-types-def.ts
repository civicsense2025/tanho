import type { FieldDef } from "@/modules/custom-types/validation";
import type { WxrComment, WxrItem } from "./parse";

/**
 * The custom-content-type definitions the WXR importers auto-create so that
 * WordPress comments and custom post types aren't dropped on the floor — they
 * become first-class Lamina content the owner can browse, edit and render.
 *
 * Every field/slug here must satisfy the custom-type meta-schema
 * (custom-types/validation.ts): slug `^[a-z][a-z0-9-]*$`, field key
 * `^[a-z][a-z0-9_]*$`. Every value produced by the data mappers must satisfy
 * the per-field zod built by custom-types/builder.ts — notably: `text` ≤
 * 10_000 chars, `richtext` ≤ 100_000, `date` must be ISO
 * (`^\d{4}-\d{2}-\d{2}(T…Z?)?$`), `email` rejects "" (z.email()), `url` must be
 * https:// or relative. Non-required fields are `.optional()`, so an EMPTY
 * optional value must be OMITTED, never sent as "".
 */

// ── Comments ────────────────────────────────────────────────────────────────

export const COMMENTS_SLUG = "comment";

export const COMMENTS_FIELDS: FieldDef[] = [
  { key: "author_name", label: "Author", kind: "text", required: false },
  // PII: kept + queryable but never rendered on a public page or indexed.
  { key: "author_email", label: "Author email", kind: "email", required: false, hidden: true },
  { key: "content", label: "Comment", kind: "richtext", required: true },
  { key: "comment_date", label: "Date", kind: "date", required: false },
  // The post the comment was on — stored as the post SLUG (text), NOT a
  // `reference`: a WP comment points at an imported *page*, not an entry, so
  // there's no entry id to reference. A text slug is honest and queryable.
  { key: "source_post", label: "On post", kind: "text", required: false },
  { key: "approved", label: "Approved", kind: "boolean", required: false },
];

export function commentsTypeInput(): { slug: string; name: string; fields: FieldDef[]; enabled: boolean } {
  return { slug: COMMENTS_SLUG, name: "Comments", fields: COMMENTS_FIELDS, enabled: true };
}

/**
 * Normalize a WXR comment date (`2024-03-01 12:00:00`, space-separated, no
 * timezone) to an ISO string the `date` field's regex accepts. Returns "" if
 * it can't be recognized, so the caller omits the optional field rather than
 * sending an invalid value.
 */
export function toIsoDate(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  // Already ISO-ish (YYYY-MM-DD optionally followed by T…): keep as-is.
  if (/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(s)) return s;
  // WXR's "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SSZ" (GMT).
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (m) return `${m[1]}T${m[2]}Z`;
  // Just a date prefix we can salvage.
  const d = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return d ? d[1]! : "";
}

/** Build a `custom:comment` entry's `data` from a WXR comment. Omits every
 *  empty optional field (email/date reject ""; text/richtext would validate
 *  but "" is noise). */
export function mapCommentToEntryData(c: WxrComment, sourcePostSlug: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    content: c.content || " ", // required richtext — never empty
    approved: c.approved,
  };
  if (c.author) data.author_name = c.author.slice(0, 10_000);
  if (c.authorEmail) data.author_email = c.authorEmail;
  const iso = toIsoDate(c.date);
  if (iso) data.comment_date = iso;
  if (sourcePostSlug) data.source_post = sourcePostSlug.slice(0, 10_000);
  return data;
}

// ── Custom post types ───────────────────────────────────────────────────────

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_FIELDS = 40; // custom-types/validation.ts MAX_FIELDS
const TEXT_MAX = 10_000; // builder.ts `text` cap

/** Coerce an arbitrary WP postmeta key to a valid Lamina field key
 *  (`^[a-z][a-z0-9_]*$`, ≤40 chars). Returns "" if nothing usable remains. */
export function sanitizeFieldKey(raw: string): string {
  let k = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_") // non-key chars → underscore
    .replace(/_+/g, "_") // collapse runs
    .replace(/^_+|_+$/g, ""); // trim leading/trailing underscore
  if (!k) return "";
  if (!/^[a-z]/.test(k)) k = `f_${k}`; // must start with a letter
  k = k.slice(0, 40);
  if (FORBIDDEN_KEYS.has(k)) return "";
  return k;
}

/** Turn a snake/kebab identifier into a Title Case label. */
export function humanize(raw: string): string {
  const words = raw.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return raw;
  return words
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Derive the field list for a CPT from the union of postmeta keys seen across
 * its items. WP-internal meta (`_`-prefixed: `_edit_lock`, `_thumbnail_id`,
 * `_wp_*`) is dropped. Everything else becomes a `text` field (the safe
 * default — postmeta values are arbitrary strings). An `original_url` url
 * field is always prepended so the item's `<link>` survives as data. Capped at
 * MAX_FIELDS.
 */
export function deriveCptFields(metaKeys: string[]): FieldDef[] {
  const seen = new Set<string>();
  const fields: FieldDef[] = [{ key: "original_url", label: "Original URL", kind: "url", required: false }];
  seen.add("original_url");
  for (const raw of metaKeys) {
    if (raw.startsWith("_")) continue; // WP-internal meta
    const key = sanitizeFieldKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    fields.push({ key, label: humanize(raw), kind: "text", required: false });
    if (fields.length >= MAX_FIELDS) break;
  }
  return fields;
}

/** Built-in entity slugs — a CPT normalizing to one of these must be renamed,
 *  because the registry resolves a built-in BEFORE a custom type of the same
 *  name (entities/registry-async.ts), which would shadow the CPT. */
const BUILTIN_ENTITY_SLUGS = new Set([
  "project",
  "guide",
  "resource",
  "hub",
  "platform",
  "matrix_pair",
  "block_pack",
  "design_pack",
]);

/**
 * Coerce a WP post-type name to a valid custom-type slug (`^[a-z][a-z0-9-]*$`),
 * prefixing `wp-` when it would collide with a built-in entity slug or when it
 * can't otherwise start with a letter. Returns the slug plus whether it was
 * renamed off a reserved name (so the caller can raise an issue).
 */
export function normalizeCustomTypeSlug(cpt: string): { slug: string; reserved: boolean } {
  let base = cpt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) base = "type";
  let reserved = false;
  // Reserved built-in name, or a slug that can't start with a letter → prefix.
  if (BUILTIN_ENTITY_SLUGS.has(base)) {
    base = `wp-${base}`;
    reserved = true;
  } else if (!/^[a-z]/.test(base)) {
    base = `wp-${base}`;
  }
  return { slug: base.slice(0, 40), reserved };
}

export function cptTypeInput(
  cpt: string,
  metaKeys: string[],
): { slug: string; name: string; fields: FieldDef[]; enabled: boolean; reserved: boolean } {
  const { slug, reserved } = normalizeCustomTypeSlug(cpt);
  return { slug, name: humanize(cpt), fields: deriveCptFields(metaKeys), enabled: true, reserved };
}

/** Build a CPT entry's `data` from a WXR item, mapping each derived field
 *  (except `original_url`) from the matching postmeta value. Values truncated
 *  to the `text` cap; empty optionals omitted. */
export function mapCptItemToEntryData(item: WxrItem, fields: FieldDef[]): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (item.link) data.original_url = item.link;
  for (const field of fields) {
    if (field.key === "original_url") continue;
    const match = item.postmeta.find((m) => sanitizeFieldKey(m.key) === field.key);
    const value = match?.value ?? "";
    if (value) data[field.key] = value.slice(0, TEXT_MAX);
  }
  return data;
}
