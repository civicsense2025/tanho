import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { splitFrontmatter, convertBody, buildEntryData, validateBlocks } from "./md-guide-to-blocks";

const GUIDES_DIR = "/sessions/fervent-ecstatic-pasteur/mnt/tanho/docs/platform-guides";
const OUT_DIR = new URL("./data/pg-upload/", import.meta.url).pathname;
mkdirSync(OUT_DIR, { recursive: true });

const RESOURCES = JSON.parse(
  readFileSync(new URL("./data/guide-resources.generated.json", import.meta.url), "utf8"),
) as {
  resources: { slug: string; title: string; url: string; source_name: string; resource_type: string }[];
  byFile: Record<string, string[]>;
};

/** Short plain fields only (title/slug/type/status) — never for JSON blobs. */
function sqlStr(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** Dollar-quoted JSON literal — no escaping needed, immune to embedded quotes/backslashes. */
function sqlJsonb(value: unknown): string {
  return `$json$${JSON.stringify(value)}$json$::jsonb`;
}

function writeChunks(prefix: string, statements: string[], perFile: number) {
  const files: string[] = [];
  for (let i = 0; i < statements.length; i += perFile) {
    const chunk = statements.slice(i, i + perFile).join("\n");
    const path = join(OUT_DIR, `${prefix}-${String(i / perFile + 1).padStart(2, "0")}.sql`);
    writeFileSync(path, chunk, "utf8");
    files.push(path);
  }
  return files;
}

function main() {
  // ── Resources ──────────────────────────────────────────────────────────
  const resourceStatements = RESOURCES.resources.map((r) => {
    const data = {
      url: r.url,
      resource_type: r.resource_type,
      source_name: r.source_name,
      summary: "",
      platforms: [],
      is_public: true,
      internal_notes: "",
    };
    return `insert into entries (type, slug, title, status, data) values ('resource', ${sqlStr(r.slug)}, ${sqlStr(r.title)}, 'published', ${sqlJsonb(data)}) on conflict (type, slug) do update set title = excluded.title, data = excluded.data, updated_at = floor(extract(epoch from now()) * 1000);`;
  });
  const resourceFiles = writeChunks("01-resources", resourceStatements, 40);

  // ── Guides + block_sets ───────────────────────────────────────────────
  const files = readdirSync(GUIDES_DIR).filter((f) => f.endsWith(".md")).sort();
  const guideStatements: string[] = [];
  const blockSetStatements: string[] = [];
  let totalBlocks = 0;

  for (const f of files) {
    const raw = readFileSync(join(GUIDES_DIR, f), "utf8");
    const { fm, body } = splitFrontmatter(raw);
    const slug = f.replace(/\.md$/, "");
    const title = String(fm.title ?? slug);
    const status = String(fm.status ?? "published").toLowerCase() === "published" ? "published" : "draft";
    const resourceSlugs = RESOURCES.byFile[f] ?? [];
    const data = buildEntryData(fm, resourceSlugs);
    const blocks = convertBody(body);
    validateBlocks(blocks);
    totalBlocks += blocks.length;

    // Idempotent across reruns: don't hardcode a freshly generated UUID as
    // the entries.id (an "on conflict do update" wouldn't touch id on an
    // existing row, so a rerun could otherwise write block_sets against an
    // id nobody's guide entry actually has). Look the id up by (type, slug)
    // instead, in a scalar subquery, so block_sets always targets whatever
    // id the guide entry actually resolved to on THIS execution.
    guideStatements.push(
      `insert into entries (type, slug, title, status, data) values ('guide', ${sqlStr(slug)}, ${sqlStr(title)}, ${sqlStr(status)}, ${sqlJsonb(data)}) on conflict (type, slug) do update set title = excluded.title, status = excluded.status, data = excluded.data, updated_at = now();`,
    );
    const idSubquery = `(select id from entries where type = 'guide' and slug = ${sqlStr(slug)})`;
    blockSetStatements.push(
      `insert into block_sets (owner_type, owner_id, variant, blocks) values ('entry:guide', ${idSubquery}, 'draft', ${sqlJsonb(blocks)}) on conflict (owner_type, owner_id, variant) do update set blocks = excluded.blocks, saved_at = floor(extract(epoch from now()) * 1000);`,
    );
    if (status === "published") {
      blockSetStatements.push(
        `insert into block_sets (owner_type, owner_id, variant, blocks) values ('entry:guide', ${idSubquery}, 'published', ${sqlJsonb(blocks)}) on conflict (owner_type, owner_id, variant) do update set blocks = excluded.blocks, saved_at = floor(extract(epoch from now()) * 1000);`,
      );
    }
  }

  const guideFiles = writeChunks("02-guides", guideStatements, 20);
  const blockSetFiles = writeChunks("03-block-sets", blockSetStatements, 4);

  console.log(`Resources: ${resourceStatements.length} statements -> ${resourceFiles.length} file(s)`);
  console.log(`Guides: ${guideStatements.length} statements -> ${guideFiles.length} file(s)`);
  console.log(`Block sets: ${blockSetStatements.length} statements (${totalBlocks} total blocks) -> ${blockSetFiles.length} file(s)`);
  console.log(`\nWritten to ${OUT_DIR}`);
}

main();
