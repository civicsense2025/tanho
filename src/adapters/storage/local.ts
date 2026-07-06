import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter } from "../types";

/**
 * Storage keys are ALWAYS server-generated (`${cuid2}.${ext}` — see
 * modules/media/actions.ts) and never user-controlled. The shape check +
 * containment check below are defense in depth, not the primary control.
 */
const KEY_RE = /^[a-z0-9]+\.[a-z0-9]{2,5}$/i;

/**
 * Extension → content type. Content types are derived from the key's
 * extension rather than persisted in a sidecar file: the upload MIME
 * allowlist (modules/media/validation.ts) is a closed set, so this map is
 * total for every key the platform can mint. Unknown extensions (files
 * dropped into the directory by hand) fall back to octet-stream, which
 * browsers download rather than render.
 */
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  pdf: "application/pdf",
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

const contentTypeFor = (key: string): string =>
  EXT_TO_MIME[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

/** Local-disk storage — files live under `<cwd>/data/uploads/`. */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly root: string;

  constructor(root: string = path.join(process.cwd(), "data", "uploads")) {
    this.root = path.resolve(root);
  }

  /** Validates the key shape and confines the resolved path to the root. */
  private resolveInsideRoot(key: string): string {
    if (!KEY_RE.test(key)) throw new Error("Invalid storage key");
    const abs = path.resolve(this.root, key);
    if (!abs.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return abs;
  }

  // Serve-time content types are derived from the key's extension, so a
  // write whose declared type disagrees with its extension would be served
  // as something else later — reject it up front.
  async put(key: string, data: Uint8Array, contentType: string): Promise<void> {
    const abs = this.resolveInsideRoot(key);
    if (contentTypeFor(key) !== contentType) {
      throw new Error("Content type does not match key extension");
    }
    await mkdir(this.root, { recursive: true });
    await writeFile(abs, data);
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveInsideRoot(key), { force: true });
  }

  publicUrl(key: string): string {
    if (!KEY_RE.test(key)) throw new Error("Invalid storage key");
    return `/api/media/${key}`;
  }

  async read(key: string): Promise<{ data: Uint8Array; contentType: string } | null> {
    let abs: string;
    try {
      abs = this.resolveInsideRoot(key);
    } catch {
      return null;
    }
    try {
      const data = await readFile(abs);
      return { data, contentType: contentTypeFor(key) };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }
}
