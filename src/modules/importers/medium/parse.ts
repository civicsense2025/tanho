import { parse, type HTMLElement } from "node-html-parser";
import { normalizeSlug } from "@/modules/importers/wxr/map";
import { extractZip, baseName } from "@/modules/importers/shared/zip";
import type { ParseIssue, Result } from "@/modules/importers/shared/types";

/** Server-side cap on posts parsed from one zip — bounds the DB-write cost,
 *  independent of the client's raw file-size check. Comfortably above any real
 *  single-account Medium export. */
const MAX_IMPORT_ROWS = 20_000;

/** One parsed Medium story → the shape map.ts turns into a page candidate. */
export type MediumPost = {
  /** Stable per-import id (the source file path) for issue messages + de-dup. */
  id: string;
  title: string;
  slug: string;
  /** The story body HTML (the inner html of `<section data-field="body">`),
   *  handed straight to the shared htmlToBlocks engine. */
  html: string;
  status: "draft" | "published";
  /** The story's public Medium URL, if present (used to build a 301 redirect). */
  canonicalUrl?: string;
};

export type ParsedMedium = { posts: MediumPost[]; issues: ParseIssue[] };

/**
 * Strip the "-<hash>" Medium appends to a story's file slug, and any leading
 * `YYYY-MM-DD_` date prefix / `draft_` marker, leaving the human slug portion.
 * "2024-01-05_My-Great-Post-abc123def.html" → "My-Great-Post". Returns "" when
 * nothing usable remains (the caller then falls back to the title).
 */
function slugFromFilename(fileBase: string): string {
  return fileBase
    .replace(/^draft_/, "")
    .replace(/^\d{4}-\d{2}-\d{2}_/, "")
    .replace(/-[0-9a-f]{6,}$/i, "");
}

/** The path portion of a canonical Medium URL, if it parses ("" otherwise). */
function slugFromCanonical(canonicalUrl: string | undefined): string {
  if (!canonicalUrl) return "";
  try {
    const path = new URL(canonicalUrl).pathname;
    const last = path.split("/").filter(Boolean).pop() ?? "";
    // Medium article paths end "…/the-title-slug-<hash>"; drop the trailing hash.
    return last.replace(/-[0-9a-f]{6,}$/i, "");
  } catch {
    return "";
  }
}

/**
 * Parse a Medium export .zip (Medium → Settings → Download your information)
 * into story candidates. Reads `posts/*.html`; each story's title comes from
 * `<h1 class="p-name">` (falling back to the filename), its body from
 * `<section data-field="body">` (falling back to the whole file), its canonical
 * URL from `<a class="p-canonical">`, and its status from the `draft_` filename
 * prefix. Tolerant: a malformed file surfaces as an issue and still imports with
 * a filename-derived title. Never throws.
 */
export async function parseMedium(file: File): Promise<Result<ParsedMedium>> {
  const extracted = await extractZip(file, {
    filter: (p) => {
      const lower = p.toLowerCase();
      return lower.startsWith("posts/") && lower.endsWith(".html");
    },
  });
  if (!extracted.ok) return extracted;
  const { entries } = extracted.data!;

  if (entries.length === 0) return { ok: false, error: "No posts/*.html files found in the Medium zip." };
  if (entries.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `This export has ${entries.length} stories — the limit is ${MAX_IMPORT_ROWS} per import.` };
  }

  const issues: ParseIssue[] = [];
  const posts: MediumPost[] = [];

  for (const entry of entries) {
    const fileBase = baseName(entry.path).replace(/\.html?$/i, "");
    const status: MediumPost["status"] = baseName(entry.path).startsWith("draft_") ? "draft" : "published";

    let title = fileBase;
    let bodyHtml = entry.text;
    let canonicalUrl: string | undefined;
    try {
      const root = parse(entry.text) as HTMLElement;
      const nameEl = root.querySelector(".p-name");
      const nameText = nameEl?.text.trim();
      if (nameText) title = nameText;

      const bodyEl = root.querySelector('section[data-field="body"]');
      if (bodyEl) bodyHtml = bodyEl.innerHTML;

      const href = root.querySelector("a.p-canonical")?.getAttribute("href")?.trim();
      if (href) canonicalUrl = href;
    } catch {
      issues.push({ kind: "post-parse-failed", detail: `${baseName(entry.path)}: could not parse HTML; imported the raw file` });
    }

    const rawSlug = slugFromFilename(fileBase) || slugFromCanonical(canonicalUrl);
    const { slug, changed } = normalizeSlug(rawSlug, title, fileBase);
    if (changed && rawSlug) {
      issues.push({ kind: "slug-normalized", detail: `"${title}" slug normalized to "${slug}"` });
    }

    posts.push({ id: entry.path, title, slug, html: bodyHtml, status, canonicalUrl });
  }

  return { ok: true, data: { posts, issues } };
}
