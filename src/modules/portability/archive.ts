import { gunzipSync, gzipSync } from "node:zlib";
import type { ExportedFile, SiteContent } from "./manifest";
import { buildTar, type TarEntry } from "./tar";
import { readTar } from "./tar-reader";

/** Archive layout: manifest.json + content.json at the root, files under uploads/. */
const CONTENT_PATH = "content.json";
const MANIFEST_PATH = "manifest.json";
const UPLOADS_PREFIX = "uploads/";

/** Assembles a site export into a single gzipped tar (.tar.gz) buffer. */
export function buildExportArchive(content: SiteContent, files: ExportedFile[]): Uint8Array {
  const entries: TarEntry[] = [
    { path: MANIFEST_PATH, data: new TextEncoder().encode(JSON.stringify(content.manifest, null, 2)) },
    { path: CONTENT_PATH, data: new TextEncoder().encode(JSON.stringify(content)) },
    ...files.map((f) => ({ path: `${UPLOADS_PREFIX}${f.key}`, data: f.bytes })),
  ];
  const tar = buildTar(entries);
  return new Uint8Array(gzipSync(tar));
}

export type ParsedArchive = { content: SiteContent; files: ExportedFile[] };

/** Inverse of buildExportArchive — used by the import CLI. */
export function parseExportArchive(gz: Uint8Array): ParsedArchive {
  const tar = new Uint8Array(gunzipSync(gz));
  const entries = readTar(tar);

  const contentEntry = entries.find((e) => e.path === CONTENT_PATH);
  if (!contentEntry) throw new Error("Archive is missing content.json");
  const content = JSON.parse(new TextDecoder().decode(contentEntry.data)) as SiteContent;

  const files: ExportedFile[] = entries
    .filter((e) => e.path.startsWith(UPLOADS_PREFIX))
    .map((e) => ({ key: e.path.slice(UPLOADS_PREFIX.length), bytes: e.data }));

  return { content, files };
}
