/**
 * Writes every realistic fixture to `__fixtures__/files/` as a real export file
 * you can upload through the live Import hub (/admin/content/import/<id>) to
 * exercise the full UI → parse → preview → commit flow by hand.
 *
 * Run:  npx tsx --tsconfig ./tsconfig.json src/modules/importers/__fixtures__/write-files.ts
 *
 * The files are committed alongside the builders so they don't have to be
 * regenerated to be used; re-run this after editing any builder to refresh them.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { ghostExportJson, ghostMembersCsv } from "./ghost";
import { wordpressWxr } from "./wordpress";
import { squarespaceWxr } from "./squarespace";
import { substackZipBytes } from "./substack";
import { mediumZipBytes } from "./medium";
import { rss2Feed, atomFeed } from "./rss";
import { markdownZipBytes } from "./markdown-zip";

const dir = join(dirname(fileURLToPath(import.meta.url)), "files");
mkdirSync(dir, { recursive: true });

const text: Array<[string, string]> = [
  ["ghost-export.json", ghostExportJson()],
  ["ghost-members.csv", ghostMembersCsv()],
  ["wordpress-export.xml", wordpressWxr()],
  ["squarespace-export.xml", squarespaceWxr()],
  ["rss-feed.xml", rss2Feed()],
  ["atom-feed.xml", atomFeed()],
];
const binary: Array<[string, Uint8Array]> = [
  ["substack-export.zip", substackZipBytes()],
  ["medium-export.zip", mediumZipBytes()],
  ["markdown-export.zip", markdownZipBytes()],
];

for (const [name, content] of text) {
  writeFileSync(join(dir, name), content, "utf8");
  console.log(`wrote ${name} (${content.length} chars)`);
}
for (const [name, bytes] of binary) {
  writeFileSync(join(dir, name), bytes);
  console.log(`wrote ${name} (${bytes.byteLength} bytes)`);
}
console.log(`\nAll fixtures written to ${dir}`);
