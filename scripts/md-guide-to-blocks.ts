/**
 * Convert a docs/platform-guides/*.md file (the hand-authored source of
 * truth for Tan's migration/evaluation guides) into a real Lamina `guide`
 * entry + block tree, validated against the ACTUAL block/entity Zod
 * schemas — then optionally write it into the live database.
 *
 * Why a custom converter instead of the built-in Markdown-ZIP importer:
 * that importer coalesces headings/tables/lists into raw HTML inside a
 * single `richtext` block (see src/modules/importers/markdown-zip/), which
 * (a) makes headings invisible to the table-of-contents block's outline
 * walker (it only looks for native `heading` nodes), and (b) can't render
 * tables at all — sanitizeRichHtml's allowlist (src/lib/sanitize.ts) has no
 * <table>/<tr>/<td>, so a markdown table piped through richtext gets its
 * structure silently stripped, leaving mashed-together cell text.
 *
 * This script instead emits native `heading`, `table`, and `callout` blocks
 * for the content that needs them, and folds everything else (prose,
 * markdown lists, ordinary blockquotes, inline code) into `richtext` blocks
 * — richtext's allowlist DOES cover p/ul/ol/li/blockquote/strong/em/a/code,
 * so that content keeps full markdown fidelity (bold, links, lists) with no
 * stripping needed. `table` and `callout` block fields are plain strings
 * with no markdown parsing at render time, so cell/body text IS stripped of
 * bold, italic, inline-code, and [link](url) markup there — otherwise the
 * raw markers would show up literally on the page.
 *
 * Usage:
 *   npx tsx scripts/md-guide-to-blocks.ts <path-to-guide.md>            (dry run — prints a summary, writes nothing)
 *   npx tsx scripts/md-guide-to-blocks.ts <path-to-guide.md> --json     (dry run — prints the full entry+blocks JSON)
 *   npx tsx scripts/md-guide-to-blocks.ts <path-to-guide.md> --write    (upserts into the live DB: entries + block_sets)
 *
 * --write requires DATABASE_URL (and TURSO_AUTH_TOKEN if remote) in env —
 * run with `npx tsx --env-file-if-exists=.env scripts/md-guide-to-blocks.ts
 * ... --write` so .env is loaded, same as e2e/fixtures/seed-e2e.ts. It is
 * idempotent: re-running for the same slug updates that entry's row and
 * replaces its block_sets rows (draft AND published).
 *
 * --write does NOT import src/lib/db/client.ts — that module has a
 * top-level `await client.execute("PRAGMA foreign_keys = ON")`, and under
 * this project's package.json (no "type": "module") tsx/esbuild transforms
 * standalone-script imports as CJS, which rejects top-level await ("Top-
 * level await is currently not supported with the cjs output format").
 * This is a pre-existing repo issue, not specific to this script — the
 * project's own e2e/fixtures/seed-e2e.ts hits the identical error in this
 * environment. Rather than touch the shared client (used everywhere else),
 * this script opens its own throwaway libsql connection with the same
 * schema, skipping the PRAGMA (irrelevant for two plain insert/update
 * statements with no cascading FKs involved).
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { marked, type Tokens } from "marked";
import { parse as parseYaml } from "yaml";
import { eq, and } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { headingSchema } from "../src/blocks/heading/fields";
import { richtextSchema } from "../src/blocks/richtext/fields";
import { tableSchema } from "../src/blocks/table/fields";
import { calloutSchema } from "../src/blocks/callout/fields";
import { imageSchema } from "../src/blocks/image/fields";
import { videoSchema } from "../src/blocks/video/fields";
import { resourceDataSchema } from "../src/entities/schemas/resource";
import { guideDataSchema } from "../src/entities/schemas/guide";
import { entries } from "../src/modules/entries/schema";
import { blockSets } from "../src/modules/pages/schema";

type BlockNode = { id: string; type: string; content: Record<string, unknown> };

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

// ─── Plain-text sanitizing for blocks that don't parse markdown ────────────

/** Strip markdown emphasis/link/code markup, keeping the underlying text.
 *  Used ONLY for table cells and callout title/body — those render raw
 *  strings (see blocks/table/Render.tsx, blocks/callout/Render.tsx), so any
 *  markdown markers left in would show up literally on the page. */
function stripInlineMarkdown(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/(^|[^\w])_([^_]+)_(?!\w)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Frontmatter ────────────────────────────────────────────────────────────

export function splitFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  return { fm: (parseYaml(m[1]) as Record<string, unknown>) ?? {}, body: m[2] };
}

function parseCost(range: unknown): { min: number; max: number; period: "mo" | "yr" | "one-time" } {
  const s = typeof range === "string" ? range : "";
  const m = s.match(/^(\d+)-(\d+)\+?\/(mo|yr)$/);
  if (!m) return { min: 0, max: 0, period: "mo" };
  return { min: Number(m[1]), max: Number(m[2]), period: m[3] as "mo" | "yr" };
}

/** guideDataSchema.difficulty has no "expert" value (beginner/intermediate/
 *  advanced only) — some guide files' frontmatter uses "expert" directly
 *  (others already correctly say "advanced" for the same -expert.md file).
 *  Normalize both to "advanced"; the level itself stays visible in the
 *  entry's slug/title ("... (Expert)"), so nothing is lost. */
function mapDifficulty(fm: Record<string, unknown>): "beginner" | "intermediate" | "advanced" {
  const raw = String(fm.difficulty ?? fm.level ?? "beginner").toLowerCase();
  if (raw === "expert" || raw === "advanced") return "advanced";
  if (raw === "intermediate") return "intermediate";
  return "beginner";
}

// ─── Special blockquote → callout detection ────────────────────────────────
// Matches the three conventions used across docs/platform-guides/*.md:
//   > **[📸 SCREENSHOT PLACEHOLDER]** — description
//   > **[🎥 VIDEO PLACEHOLDER]** — description
//   > _Replace this callout with the real screenshot/video before publishing._
// ---
//   > **💡 Tip — subtitle**
//   >
//   > body paragraph(s)
// ---
//   > **🚨 Danger — subtitle**
//   >
//   > body paragraph(s)
// Anything else stays an ordinary blockquote inside a richtext block (the
// richtext allowlist renders <blockquote> natively, so no data is lost).
//
// IMPORTANT: the screenshot/video placeholder convention does NOT become a
// callout. Checked against the real guide page template
// (src/modules/entries/public/GuideDetail.tsx) and a screenshot of a live
// rendered guide: placeholders render as an empty `image`/`video` block —
// src="" falls back to the shared striped MediaPlaceholder
// (src/blocks/image/Placeholder.tsx) — with the block's own `caption` field
// shown as an italic caption underneath. A text callout saying "[SCREENSHOT
// PLACEHOLDER]" would look completely wrong next to how the rest of the
// hub's guides actually present unfilled media.

function blockquoteToMediaPlaceholder(text: string): BlockNode | null {
  const first = text.split(/\n{2,}/)[0]?.trim() ?? "";
  const m = first.match(/^\*\*\[(📸|🎥)\s*([^\]]+)\]\*\*\s*—\s*([\s\S]+)$/);
  if (!m) return null;
  const emoji = m[1];
  const isVideo = emoji === "🎥";
  const caption = stripInlineMarkdown(m[3]).slice(0, 300);
  return isVideo
    ? { id: nextId("video"), type: "video", content: { src: "", poster: "", caption } }
    : { id: nextId("image"), type: "image", content: { src: "", alt: caption.slice(0, 300), caption } };
}

function blockquoteToCallout(text: string): BlockNode | null {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const first = paras[0] ?? "";

  const tip = first.match(/^\*\*💡\s*Tip\s*(?:—\s*(.*))?\*\*$/);
  if (tip) {
    const title = tip[1]?.trim() || "Tip";
    const body = stripInlineMarkdown(paras.slice(1).join(" "));
    return { id: nextId("callout"), type: "callout", content: { tone: "tip", title: `💡 ${title}`, body } };
  }

  const danger = first.match(/^\*\*🚨\s*(.*)\*\*$/);
  if (danger) {
    const title = danger[1]?.trim() || "Danger";
    const body = stripInlineMarkdown(paras.slice(1).join(" "));
    return { id: nextId("callout"), type: "callout", content: { tone: "danger", title: `🚨 ${title}`, body } };
  }

  return null;
}

// ─── Markdown body → block tree ─────────────────────────────────────────────

export function convertBody(body: string): BlockNode[] {
  const tokens = marked.lexer(body);
  const blocks: BlockNode[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const md = buffer.join("").trim();
    buffer = [];
    if (!md) return;
    blocks.push({ id: nextId("rt"), type: "richtext", content: { md } });
  };

  for (const token of tokens) {
    if (token.type === "heading") {
      const h = token as Tokens.Heading;
      if (h.depth === 1) continue; // page title lives in entries.title, not the body
      // "## Sources" is always the guide's final section (verified across all
      // 60 files) and renders through the template's own "Further reading"
      // block (GuideDetail.tsx), driven by entries.data.resource_slugs — not
      // through body blocks. Stop converting here rather than emit a
      // redundant plain-list version of the same citations.
      if (/^sources$/i.test(h.text.trim())) {
        flush();
        break;
      }
      flush();
      blocks.push({
        id: nextId("h"),
        type: "heading",
        content: { text: stripInlineMarkdown(h.text), level: `h${h.depth}`, align: "left" },
      });
      continue;
    }

    if (token.type === "table") {
      const t = token as Tokens.Table;
      flush();
      blocks.push({
        id: nextId("table"),
        type: "table",
        content: {
          columns: t.header.map((c) => stripInlineMarkdown(c.text)),
          rows: t.rows.map((row) => row.map((c) => stripInlineMarkdown(c.text))),
        },
      });
      continue;
    }

    if (token.type === "blockquote") {
      const bq = token as Tokens.Blockquote;
      const media = blockquoteToMediaPlaceholder(bq.text);
      if (media) {
        flush();
        blocks.push(media);
        continue;
      }
      const callout = blockquoteToCallout(bq.text);
      if (callout) {
        flush();
        blocks.push(callout);
        continue;
      }
      // Ordinary blockquote — keep as markdown inside the prose buffer.
      buffer.push(bq.raw);
      continue;
    }

    // paragraph, list, code, space, hr, html, etc. — all render fine as
    // markdown inside a richtext block, so just accumulate the raw source.
    buffer.push(token.raw);
  }

  flush();
  return blocks;
}

// ─── Entry data mapping ─────────────────────────────────────────────────────

export function buildEntryData(fm: Record<string, unknown>, resourceSlugs: string[] = []) {
  const cost = parseCost(fm.cost_range_usd);
  const raw = {
    tagline: String(fm.tagline ?? ""),
    summary: "",
    category: String(fm.category ?? ""),
    source_platform: String(fm.source_platform ?? ""),
    target_platform: String(fm.target_platform ?? ""),
    difficulty: mapDifficulty(fm),
    cost_min_usd: cost.min,
    cost_max_usd: cost.max,
    cost_period: cost.period,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    // Template-rendered fields (GuideDetail.tsx renders "Skills required" /
    // "Requirements" headings + lists, and the effort badge, directly from
    // these — see scripts/md-guide-to-blocks.ts header note). Sourced from
    // frontmatter arrays/numbers the guide files carry once populated.
    skills_required: Array.isArray(fm.skills_required) ? fm.skills_required : [],
    requirements: Array.isArray(fm.requirements) ? fm.requirements : [],
    effort_hours_min: typeof fm.effort_hours_min === "number" ? fm.effort_hours_min : 0,
    effort_hours_max: typeof fm.effort_hours_max === "number" ? fm.effort_hours_max : 0,
    // "Further reading" (GuideDetail.tsx) renders from this — the generated
    // resource-dedup artifact (scripts/data/guide-resources.generated.json),
    // not from a body block. See the "## Sources" skip in convertBody.
    resource_slugs: resourceSlugs,
  };
  return guideDataSchema.parse(raw);
}

// ─── Validation (mirrors validateBlockTree in src/modules/pages/blocks-io.ts,
// scoped to the handful of block types this converter actually emits) ──────

const SCHEMA_BY_TYPE: Record<string, { parse: (v: unknown) => unknown }> = {
  heading: headingSchema,
  richtext: richtextSchema,
  table: tableSchema,
  callout: calloutSchema,
  image: imageSchema,
  video: videoSchema,
};

export function validateBlocks(blocks: BlockNode[]): void {
  for (const b of blocks) {
    const schema = SCHEMA_BY_TYPE[b.type];
    if (!schema) throw new Error(`No local schema registered for block type "${b.type}" — add it to SCHEMA_BY_TYPE`);
    schema.parse(b.content); // throws with a real Zod error on mismatch
  }
}

// ─── Resource artifact (## Sources → resource_slugs) ───────────────────────
// Generated once by scripts/_extract-resources.py from every guide's
// "## Sources" list, deduped by URL. See scripts/data/guide-resources.generated.json.

type ResourceRecord = { slug: string; title: string; url: string; source_name: string; resource_type: string };
type ResourcesArtifact = { resources: ResourceRecord[]; byFile: Record<string, string[]> };

let resourcesArtifactCache: ResourcesArtifact | null | undefined;

function loadResourcesArtifact(): ResourcesArtifact | null {
  if (resourcesArtifactCache !== undefined) return resourcesArtifactCache;
  try {
    const path = new URL("./data/guide-resources.generated.json", import.meta.url);
    resourcesArtifactCache = JSON.parse(readFileSync(path, "utf8")) as ResourcesArtifact;
  } catch {
    resourcesArtifactCache = null; // artifact not generated yet — resource_slugs stays empty
  }
  return resourcesArtifactCache;
}

/** See the file-header note: a throwaway connection instead of importing
 *  src/lib/db/client.ts, whose top-level await breaks under this project's
 *  current standalone-script (CJS) transform. Same URL/token env vars. */
function openDb() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "file:./data/dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema: { entries, blockSets } });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const [, , filePath, ...flags] = process.argv;
  if (!filePath) {
    console.error("Usage: npx tsx scripts/md-guide-to-blocks.ts <path-to-guide.md> [--write|--json]");
    process.exit(1);
  }

  const raw = readFileSync(filePath, "utf8");
  const { fm, body } = splitFrontmatter(raw);
  const slug = basename(filePath).replace(/\.md$/, "");
  const title = String(fm.title ?? slug);
  const status = String(fm.status ?? "published").toLowerCase() === "published" ? "published" : "draft";

  const artifact = loadResourcesArtifact();
  const resourceSlugs = artifact?.byFile[basename(filePath)] ?? [];
  const data = buildEntryData(fm, resourceSlugs);
  const blocks = convertBody(body);
  validateBlocks(blocks);

  const summary = {
    slug,
    title,
    status,
    data,
    blockCount: blocks.length,
    blockTypeCounts: blocks.reduce<Record<string, number>>((acc, b) => {
      acc[b.type] = (acc[b.type] ?? 0) + 1;
      return acc;
    }, {}),
  };

  if (flags.includes("--json")) {
    console.log(JSON.stringify({ ...summary, blocks }, null, 2));
    return;
  }

  console.log(JSON.stringify(summary, null, 2));

  if (flags.includes("--write")) {
    const db = openDb();

    // Upsert every resource this guide cites (by type+slug — idempotent
    // across guides that share a citation) BEFORE the guide itself, so
    // resource_slugs always points at rows that already exist.
    const cited = (artifact?.resources ?? []).filter((r) => resourceSlugs.includes(r.slug));
    for (const r of cited) {
      const rData = resourceDataSchema.parse({
        url: r.url,
        resource_type: r.resource_type,
        source_name: r.source_name,
        is_public: true,
      });
      const existingResource = await db
        .select({ id: entries.id })
        .from(entries)
        .where(and(eq(entries.type, "resource"), eq(entries.slug, r.slug)))
        .limit(1);
      if (existingResource[0]) {
        await db
          .update(entries)
          .set({ title: r.title, data: rData, updatedAt: Date.now() })
          .where(eq(entries.id, existingResource[0].id));
      } else {
        await db.insert(entries).values({
          type: "resource",
          slug: r.slug,
          title: r.title,
          status: "published",
          data: rData,
        });
      }
    }

    const existing = await db
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.type, "guide"), eq(entries.slug, slug)))
      .limit(1);

    const id = existing[0]?.id ?? crypto.randomUUID();

    if (existing[0]) {
      await db
        .update(entries)
        .set({ title, status, data, updatedAt: Date.now() })
        .where(eq(entries.id, id));
    } else {
      await db.insert(entries).values({ id, type: "guide", slug, title, status, data });
    }

    await db.delete(blockSets).where(and(eq(blockSets.ownerType, "entry:guide"), eq(blockSets.ownerId, id)));
    await db.insert(blockSets).values({ ownerType: "entry:guide", ownerId: id, variant: "draft", blocks });
    if (status === "published") {
      await db.insert(blockSets).values({ ownerType: "entry:guide", ownerId: id, variant: "published", blocks });
    }

    console.log(`\nWrote entry ${id} (guide/${slug}) + ${blocks.length} blocks (${status}) + ${cited.length} resource(s).`);
  } else {
    console.log("\nDry run only — pass --write to upsert this into the database, or --json to see the full block tree.");
  }
}

// Only run when invoked directly (`npx tsx scripts/md-guide-to-blocks.ts ...`) —
// not when imported by another script (e.g. a batch test harness) for its
// exported helpers (splitFrontmatter/convertBody/buildEntryData/validateBlocks).
if (process.argv[1]?.endsWith("md-guide-to-blocks.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
