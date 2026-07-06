import { zipSync, strToU8 } from "fflate";

/**
 * Build a `File` from a `{ path → utf-8 string }` map, exactly the way the real
 * platform exports (and the importer parse tests) do. Shared by the zip-based
 * fixtures (Substack, Medium, Markdown) so they produce a byte-for-byte real zip
 * the live importer can accept.
 */
export function zipFile(files: Record<string, string>, name: string): File {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) entries[path] = strToU8(content);
  return new File([zipSync(entries)], name, { type: "application/zip" });
}

/** The raw zip bytes (for writing a .zip fixture to disk). */
export function zipBytes(files: Record<string, string>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) entries[path] = strToU8(content);
  return zipSync(entries);
}
