import { parse as parseYaml } from "yaml";
import { markdownToSafeHtml } from "@/lib/sanitize";
import { normalizeSlug } from "@/modules/importers/wxr/map";
import { extractZip, baseName } from "@/modules/importers/shared/zip";
import type { ParseIssue } from "@/modules/importers/shared/types";

/** Server-side cap on files parsed from one zip — bounds the DB-write cost. */
const MAX_IMPORT_ROWS = 20_000;

/** One parsed markdown document → a Lamina page candidate. `html` is already
 *  sanitized (markdownToSafeHtml). */
export type MdDoc = {
  /** Source file path (for issue messages + de-dup). */
  path: string;
  title: string;
  slug: string;
  html: string;
  status: "draft" | "published";
  tags: string[];
  /** Original-URL aliases (Jekyll `redirect_from` / Hugo `aliases`) → 301s. */
  aliases: string[];
};

export type ParsedMarkdownZip = { ok: true; docs: MdDoc[]; issues: ParseIssue[]; skipped: string[] };

/** Split a `---\n…\n---` YAML frontmatter block off the top of a markdown file.
 *  Returns `{ front, body }`; `front` is "" when there's no frontmatter. */
function splitFrontmatter(md: string): { front: string; body: string } {
  // Frontmatter must be the very first thing in the file.
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md);
  if (!m) return { front: "", body: md };
  return { front: m[1] ?? "", body: md.slice(m[0].length) };
}

/** Coerce a frontmatter value to a string[] (handles `tags: [a, b]`, `tags: a`, etc.). */
function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

/**
 * Parse a zip of `*.md` files (each optionally with YAML frontmatter) into page
 * candidates. Body markdown → sanitized HTML via markdownToSafeHtml (already a dep),
 * so the shared htmlToBlocks engine can chunk it exactly like every other importer.
 * Malformed frontmatter on one file surfaces as an issue; the file still imports with
 * a filename-derived title. Never throws.
 */
export async function parseMarkdownZip(
  file: File,
): Promise<ParsedMarkdownZip | { ok: false; error: string }> {
  const extracted = await extractZip(file, {
    filter: (p) => p.toLowerCase().endsWith(".md") || p.toLowerCase().endsWith(".markdown"),
  });
  if (!extracted.ok) return extracted;
  const { entries, skipped } = extracted.data!;

  if (entries.length === 0) return { ok: false, error: "No .md files found in the zip." };
  if (entries.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `This zip has ${entries.length} files — the limit is ${MAX_IMPORT_ROWS} per import.` };
  }

  const issues: ParseIssue[] = [];
  const docs: MdDoc[] = [];

  for (const entry of entries) {
    const { front, body } = splitFrontmatter(entry.text);
    let fm: Record<string, unknown> = {};
    if (front) {
      try {
        const parsed = parseYaml(front);
        if (parsed && typeof parsed === "object") fm = parsed as Record<string, unknown>;
      } catch {
        issues.push({ kind: "frontmatter-invalid", detail: `${baseName(entry.path)}: frontmatter isn't valid YAML; ignored` });
      }
    }

    const fileBase = baseName(entry.path).replace(/\.(md|markdown)$/i, "");
    const title = typeof fm.title === "string" && fm.title.trim() ? fm.title.trim() : fileBase;
    const rawSlug = typeof fm.slug === "string" ? fm.slug : fileBase;
    const { slug, changed } = normalizeSlug(rawSlug, title, fileBase);
    if (changed && rawSlug) {
      issues.push({ kind: "slug-normalized", detail: `"${title}" slug normalized to "${slug}"` });
    }

    const isDraft = fm.draft === true || fm.published === false;
    const html = markdownToSafeHtml(body);

    docs.push({
      path: entry.path,
      title,
      slug,
      html,
      status: isDraft ? "draft" : "published",
      tags: toStringArray(fm.tags).slice(0, 20).map((t) => t.slice(0, 40)),
      aliases: [...toStringArray(fm.aliases), ...toStringArray(fm.redirect_from)]
        .map((a) => a.trim())
        .filter((a) => a.startsWith("/")),
    });
  }

  return { ok: true, docs, issues, skipped };
}
