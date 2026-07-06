import { readdir, stat, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

/**
 * Static assets under the app's `/public` folder — the "link a local file"
 * source for self-hosters, distinct from DB-tracked uploads (`media` table,
 * served via `/api/media`). A `/public` file is served by the framework at its
 * own path (`/logo.svg`), so it needs no DB row and no function invocation.
 *
 * Server-only in practice (node:fs imports); the only callers are the
 * `"use server"` actions in actions.ts, which gate every entry behind
 * `requireUser`. Listing reveals folder structure and writing touches disk, so
 * that auth gate is load-bearing. The `/public` root is resolved once from cwd
 * and every path is confined to it.
 */

const PUBLIC_ROOT = path.resolve(process.cwd(), "public");

export type PublicAsset = { name: string; url: string; size: number; mtime: number };

/** Extensions worth showing in a media picker (link-safe — SVG already in the
 *  folder is fine to reference; it's only unsafe to ACCEPT as an upload). */
const LISTABLE_EXT = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "avif", "svg", "ico", "pdf", "mp4", "webm",
]);

/** Directories never surfaced (framework/build/system noise). */
const SKIP_DIRS = new Set([".git", "node_modules", ".next", ".well-known"]);
const MAX_DEPTH = 6;
const MAX_ENTRIES = 2000; // safety cap on a pathological tree

const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/**
 * Recursively list link-worthy files under `/public`. Returns each file's
 * served URL (`/<relative path>`), newest first. Skips dotfiles, skip-dirs, and
 * anything whose extension isn't in LISTABLE_EXT. Never follows symlinks out of
 * root (uses withFileTypes and only recurses real directories).
 */
export async function listPublicAssets(): Promise<PublicAsset[]> {
  const out: PublicAsset[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH || out.length >= MAX_ENTRIES) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= MAX_ENTRIES) return;
      if (entry.name.startsWith(".")) continue; // dotfiles/dirs
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(abs, depth + 1);
      } else if (entry.isFile()) {
        if (!LISTABLE_EXT.has(extOf(entry.name))) continue;
        try {
          const s = await stat(abs);
          const rel = path.relative(PUBLIC_ROOT, abs).split(path.sep).join("/");
          out.push({ name: rel, url: `/${rel}`, size: s.size, mtime: s.mtimeMs });
        } catch {
          // unreadable entry — skip
        }
      }
    }
  }

  await walk(PUBLIC_ROOT, 0);
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

/**
 * Turn a user-supplied filename + a trusted extension into a safe basename to
 * write under `/public`. Drops any directory part, strips characters outside a
 * conservative set, forces the extension from the MIME map (never the user's),
 * and rejects empties. The result is a bare filename — never a path.
 */
export function safePublicName(rawName: string, ext: string): string {
  const base = (rawName.split(/[/\\]/).pop() ?? "") // basename only
    .replace(/\.[^.]*$/, "") // drop the author's extension
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-") // conservative charset
    .replace(/^[.\-]+|[.\-]+$/g, "") // no leading/trailing dot or dash
    .slice(0, 100);
  const stem = base || "asset";
  return `${stem}.${ext}`;
}

/** Resolve a bare filename to an absolute path CONFINED to `/public`. Throws on
 *  any attempt to escape (path separators, `..`, absolute paths). */
function resolveInsidePublic(name: string): string {
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    throw new Error("Invalid file name");
  }
  const abs = path.resolve(PUBLIC_ROOT, name);
  if (abs !== path.join(PUBLIC_ROOT, name) || !abs.startsWith(PUBLIC_ROOT + path.sep)) {
    throw new Error("Invalid file name");
  }
  return abs;
}

/** Does a file with this bare name already exist directly under `/public`? */
export async function publicAssetExists(name: string): Promise<boolean> {
  try {
    await access(resolveInsidePublic(name));
    return true;
  } catch {
    return false;
  }
}

/**
 * Write bytes to `/public/<name>` and return the served URL (`/<name>`). The
 * caller MUST have already validated MIME + magic bytes + size and derived
 * `name` via safePublicName (so the extension is trusted). Confined to the
 * public root; refuses to overwrite an existing file (callers pick a fresh
 * name). Server-only; gate behind requireUser at the action layer.
 */
export async function writePublicAsset(name: string, data: Uint8Array): Promise<string> {
  const abs = resolveInsidePublic(name);
  await mkdir(PUBLIC_ROOT, { recursive: true });
  await writeFile(abs, data, { flag: "wx" }); // wx: fail if it already exists
  return `/${name}`;
}
