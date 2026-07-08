import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { splitFrontmatter, convertBody, buildEntryData, validateBlocks } from "./md-guide-to-blocks";

const DIR = "/sessions/fervent-ecstatic-pasteur/mnt/tanho/docs/platform-guides";
const RESOURCES = JSON.parse(
  readFileSync(new URL("./data/guide-resources.generated.json", import.meta.url), "utf8"),
) as { byFile: Record<string, string[]> };

function main() {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".md")).sort();
  let ok = 0;
  let fail = 0;
  const typeCounts: Record<string, number> = {};
  let sourcesHeadingLeaked = 0;
  let resourceSlugCoverage = 0;

  for (const f of files) {
    try {
      const raw = readFileSync(join(DIR, f), "utf8");
      const { fm, body } = splitFrontmatter(raw);
      const resourceSlugs = RESOURCES.byFile[f] ?? [];
      const data = buildEntryData(fm, resourceSlugs) as { resource_slugs: string[] };
      const blocks = convertBody(body);
      validateBlocks(blocks);
      for (const b of blocks) {
        typeCounts[b.type] = (typeCounts[b.type] ?? 0) + 1;
        if (b.type === "heading" && /sources/i.test(String((b.content as { text?: string }).text ?? ""))) {
          sourcesHeadingLeaked++;
        }
      }
      if (data.resource_slugs.length > 0) resourceSlugCoverage++;
      ok++;
    } catch (err) {
      fail++;
      console.log(`FAIL: ${basename(f)}`);
      console.log(`  ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nOK: ${ok}   FAIL: ${fail}   (of ${files.length} files)`);
  console.log("Block type totals:", typeCounts);
  console.log("Files with a leaked 'Sources' heading block:", sourcesHeadingLeaked);
  console.log("Files with resource_slugs populated:", resourceSlugCoverage, "/", files.length);
}

main();
