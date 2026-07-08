import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { splitFrontmatter, convertBody } from "./md-guide-to-blocks";

const DIR = "/sessions/fervent-ecstatic-pasteur/mnt/tanho/docs/platform-guides";

const files = readdirSync(DIR).filter((f) => f.endsWith(".md")).sort();
for (const f of files) {
  const raw = readFileSync(join(DIR, f), "utf8");
  const { body } = splitFrontmatter(raw);
  const blocks = convertBody(body);
  for (const b of blocks) {
    if (b.type !== "table") continue;
    const { columns, rows } = b.content as { columns: string[]; rows: string[][] };
    (rows as string[][]).forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell.length > 500) {
          console.log(`\n=== ${f} | row ${ri} col "${columns[ci]}" (${cell.length} chars) ===`);
          console.log(cell);
        }
      });
    });
  }
}
