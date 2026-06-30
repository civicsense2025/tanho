import { createClient } from "@libsql/client";

function makeClient() {
  const url = process.env.TURSO_DATABASE_URL || "file:./db/portfolio.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return createClient({ url, authToken });
}

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) _client = makeClient();
  return _client;
}

async function migrate() {
  const db = getClient();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS projects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT    NOT NULL UNIQUE,
      title       TEXT    NOT NULL,
      tagline     TEXT,
      description TEXT,
      cover_image TEXT,
      logo_url    TEXT,
      tags        TEXT    DEFAULT '[]',
      github_url  TEXT,
      live_url    TEXT,
      year        INTEGER,
      status      TEXT    NOT NULL DEFAULT 'draft',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_blocks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type        TEXT    NOT NULL,
      content     TEXT    NOT NULL DEFAULT '{}',
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS platforms (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT    NOT NULL UNIQUE,
      name        TEXT    NOT NULL,
      kind        TEXT    NOT NULL DEFAULT 'both',
      category    TEXT,
      logo_url    TEXT,
      description TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tags (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guides (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      slug              TEXT    NOT NULL UNIQUE,
      title             TEXT    NOT NULL,
      tagline           TEXT,
      summary           TEXT,
      source_platform   TEXT    NOT NULL,
      target_platform   TEXT    NOT NULL,
      difficulty        TEXT    NOT NULL DEFAULT 'intermediate',
      effort_hours_min  INTEGER,
      effort_hours_max  INTEGER,
      cost_min_usd      INTEGER,
      cost_max_usd      INTEGER,
      cost_period       TEXT    NOT NULL DEFAULT 'monthly',
      skills_required   TEXT    DEFAULT '[]',
      requirements      TEXT    DEFAULT '[]',
      cover_image       TEXT,
      status            TEXT    NOT NULL DEFAULT 'draft',
      sort_order        INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guide_steps (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      guide_id    INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      title       TEXT,
      type        TEXT    NOT NULL,
      content     TEXT    NOT NULL DEFAULT '{}',
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS guide_tags (
      guide_id INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (guide_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS resources (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      title          TEXT    NOT NULL,
      url            TEXT    NOT NULL,
      source_name    TEXT,
      summary        TEXT,
      resource_type  TEXT    NOT NULL DEFAULT 'article',
      internal_notes TEXT,
      is_public      INTEGER NOT NULL DEFAULT 1,
      status         TEXT    NOT NULL DEFAULT 'draft',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resource_platforms (
      resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
      PRIMARY KEY (resource_id, platform_id)
    );

    CREATE TABLE IF NOT EXISTS guide_resources (
      guide_id    INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guide_id, resource_id)
    );

    CREATE TABLE IF NOT EXISTS quiz_responses (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      answers         TEXT    NOT NULL,
      recommendation  TEXT    NOT NULL,
      source_platform TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

let _migrated = false;
async function db() {
  if (!_migrated) {
    await migrate();
    _migrated = true;
  }
  return getClient();
}

export type ProjectStatus = "draft" | "published";

export interface Project {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  cover_image: string | null;
  logo_url: string | null;
  tags: string;
  github_url: string | null;
  live_url: string | null;
  year: number | null;
  status: ProjectStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectBlock {
  id: number;
  project_id: number;
  type: "text" | "image" | "video" | "metric" | "gallery";
  content: string;
  sort_order: number;
}

function row(r: Record<string, unknown>): Project {
  return r as unknown as Project;
}

function blockRow(r: Record<string, unknown>): ProjectBlock {
  return r as unknown as ProjectBlock;
}

export async function listProjects(publishedOnly = true): Promise<Project[]> {
  const client = await db();
  const where = publishedOnly ? "WHERE status = 'published'" : "";
  const result = await client.execute(
    `SELECT * FROM projects ${where} ORDER BY sort_order ASC, id DESC`
  );
  return result.rows.map((r) => row(r as Record<string, unknown>));
}

export async function getProject(slug: string): Promise<Project | undefined> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM projects WHERE slug = ?", args: [slug] });
  return result.rows[0] ? row(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function getProjectById(id: number): Promise<Project | undefined> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM projects WHERE id = ?", args: [id] });
  return result.rows[0] ? row(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function createProject(data: Omit<Project, "id" | "created_at" | "updated_at">): Promise<Project> {
  const client = await db();
  const result = await client.execute({
    sql: `INSERT INTO projects (slug, title, tagline, description, cover_image, logo_url, tags, github_url, live_url, year, status, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.slug, data.title, data.tagline, data.description, data.cover_image, data.logo_url, data.tags, data.github_url, data.live_url, data.year, data.status, data.sort_order],
  });
  return (await getProjectById(Number(result.lastInsertRowid)))!;
}

export async function updateProject(id: number, data: Partial<Omit<Project, "id" | "created_at" | "updated_at">>): Promise<Project> {
  const client = await db();
  const keys = Object.keys(data) as (keyof typeof data)[];
  const fields = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => data[k] ?? null);
  await client.execute({ sql: `UPDATE projects SET ${fields}, updated_at = datetime('now') WHERE id = ?`, args: [...values, id] });
  return (await getProjectById(id))!;
}

export async function deleteProject(id: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM projects WHERE id = ?", args: [id] });
}

export async function getBlocks(projectId: number): Promise<ProjectBlock[]> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM project_blocks WHERE project_id = ? ORDER BY sort_order ASC", args: [projectId] });
  return result.rows.map((r) => blockRow(r as Record<string, unknown>));
}

export async function upsertBlocks(projectId: number, blocks: Omit<ProjectBlock, "id" | "project_id">[]): Promise<void> {
  const client = await db();
  await client.batch([
    { sql: "DELETE FROM project_blocks WHERE project_id = ?", args: [projectId] },
    ...blocks.map((b, i) => ({ sql: "INSERT INTO project_blocks (project_id, type, content, sort_order) VALUES (?, ?, ?, ?)", args: [projectId, b.type, b.content, i] })),
  ], "write");
}

// ---------- Platforms ----------

export type PlatformKind = "source" | "target" | "both";

export interface Platform {
  id: number;
  slug: string;
  name: string;
  kind: PlatformKind;
  category: string | null;
  logo_url: string | null;
  description: string | null;
  sort_order: number;
}

function platformRow(r: Record<string, unknown>): Platform {
  return r as unknown as Platform;
}

export async function listPlatforms(): Promise<Platform[]> {
  const client = await db();
  const result = await client.execute("SELECT * FROM platforms ORDER BY sort_order ASC, name ASC");
  return result.rows.map((r) => platformRow(r as Record<string, unknown>));
}

export async function upsertPlatform(data: Omit<Platform, "id">): Promise<void> {
  const client = await db();
  await client.execute({
    sql: `INSERT INTO platforms (slug, name, kind, category, logo_url, description, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET name=excluded.name, kind=excluded.kind, category=excluded.category,
            logo_url=excluded.logo_url, description=excluded.description, sort_order=excluded.sort_order`,
    args: [data.slug, data.name, data.kind, data.category, data.logo_url, data.description, data.sort_order],
  });
}

// ---------- Tags ----------

export interface Tag {
  id: number;
  slug: string;
  name: string;
}

function tagRow(r: Record<string, unknown>): Tag {
  return r as unknown as Tag;
}

export async function listTags(): Promise<Tag[]> {
  const client = await db();
  const result = await client.execute("SELECT * FROM tags ORDER BY name ASC");
  return result.rows.map((r) => tagRow(r as Record<string, unknown>));
}

export async function upsertTag(data: Omit<Tag, "id">): Promise<Tag> {
  const client = await db();
  await client.execute({
    sql: `INSERT INTO tags (slug, name) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET name=excluded.name`,
    args: [data.slug, data.name],
  });
  const result = await client.execute({ sql: "SELECT * FROM tags WHERE slug = ?", args: [data.slug] });
  return tagRow(result.rows[0] as Record<string, unknown>);
}

// ---------- Guides ----------

export type GuideStatus = "draft" | "published";
export type GuideDifficulty = "beginner" | "intermediate" | "advanced";
export type CostPeriod = "monthly" | "one_time";

export interface Guide {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  summary: string | null;
  source_platform: string;
  target_platform: string;
  difficulty: GuideDifficulty;
  effort_hours_min: number | null;
  effort_hours_max: number | null;
  cost_min_usd: number | null;
  cost_max_usd: number | null;
  cost_period: CostPeriod;
  skills_required: string;
  requirements: string;
  cover_image: string | null;
  status: GuideStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GuideStep {
  id: number;
  guide_id: number;
  title: string | null;
  type: "text" | "image" | "video" | "code" | "callout" | "checklist";
  content: string;
  sort_order: number;
}

function guideRow(r: Record<string, unknown>): Guide {
  return r as unknown as Guide;
}

function guideStepRow(r: Record<string, unknown>): GuideStep {
  return r as unknown as GuideStep;
}

export interface GuideFilter {
  publishedOnly?: boolean;
  sourcePlatform?: string;
  targetPlatform?: string;
  maxDifficulty?: GuideDifficulty;
}

const DIFFICULTY_RANK: Record<GuideDifficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export async function listGuides(filter: GuideFilter = {}): Promise<Guide[]> {
  const client = await db();
  const where: string[] = [];
  const args: string[] = [];
  if (filter.publishedOnly !== false) where.push("status = 'published'");
  if (filter.sourcePlatform) { where.push("source_platform = ?"); args.push(filter.sourcePlatform); }
  if (filter.targetPlatform) { where.push("target_platform = ?"); args.push(filter.targetPlatform); }
  const sql = `SELECT * FROM guides ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY sort_order ASC, id DESC`;
  const result = await client.execute({ sql, args });
  let guides = result.rows.map((r) => guideRow(r as Record<string, unknown>));
  if (filter.maxDifficulty) {
    const ceiling = DIFFICULTY_RANK[filter.maxDifficulty];
    guides = guides.filter((g) => DIFFICULTY_RANK[g.difficulty] <= ceiling);
  }
  return guides;
}

export async function getGuide(slug: string): Promise<Guide | undefined> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM guides WHERE slug = ?", args: [slug] });
  return result.rows[0] ? guideRow(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function getGuideById(id: number): Promise<Guide | undefined> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM guides WHERE id = ?", args: [id] });
  return result.rows[0] ? guideRow(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function createGuide(data: Omit<Guide, "id" | "created_at" | "updated_at">): Promise<Guide> {
  const client = await db();
  const result = await client.execute({
    sql: `INSERT INTO guides (slug, title, tagline, summary, source_platform, target_platform, difficulty,
            effort_hours_min, effort_hours_max, cost_min_usd, cost_max_usd, cost_period,
            skills_required, requirements, cover_image, status, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.slug, data.title, data.tagline, data.summary, data.source_platform, data.target_platform,
      data.difficulty, data.effort_hours_min, data.effort_hours_max, data.cost_min_usd, data.cost_max_usd,
      data.cost_period, data.skills_required, data.requirements, data.cover_image, data.status, data.sort_order],
  });
  return (await getGuideById(Number(result.lastInsertRowid)))!;
}

export async function updateGuide(id: number, data: Partial<Omit<Guide, "id" | "created_at" | "updated_at">>): Promise<Guide> {
  const client = await db();
  const keys = Object.keys(data) as (keyof typeof data)[];
  const fields = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => data[k] ?? null);
  await client.execute({ sql: `UPDATE guides SET ${fields}, updated_at = datetime('now') WHERE id = ?`, args: [...values, id] });
  return (await getGuideById(id))!;
}

export async function deleteGuide(id: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM guides WHERE id = ?", args: [id] });
}

export async function getSteps(guideId: number): Promise<GuideStep[]> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM guide_steps WHERE guide_id = ? ORDER BY sort_order ASC", args: [guideId] });
  return result.rows.map((r) => guideStepRow(r as Record<string, unknown>));
}

export async function upsertSteps(guideId: number, steps: Omit<GuideStep, "id" | "guide_id">[]): Promise<void> {
  const client = await db();
  await client.batch([
    { sql: "DELETE FROM guide_steps WHERE guide_id = ?", args: [guideId] },
    ...steps.map((s, i) => ({
      sql: "INSERT INTO guide_steps (guide_id, title, type, content, sort_order) VALUES (?, ?, ?, ?, ?)",
      args: [guideId, s.title, s.type, s.content, i],
    })),
  ], "write");
}

export async function setGuideTags(guideId: number, tagIds: number[]): Promise<void> {
  const client = await db();
  await client.batch([
    { sql: "DELETE FROM guide_tags WHERE guide_id = ?", args: [guideId] },
    ...tagIds.map((tagId) => ({ sql: "INSERT INTO guide_tags (guide_id, tag_id) VALUES (?, ?)", args: [guideId, tagId] })),
  ], "write");
}

export async function getGuideTags(guideId: number): Promise<Tag[]> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT t.* FROM tags t JOIN guide_tags gt ON gt.tag_id = t.id WHERE gt.guide_id = ? ORDER BY t.name ASC`,
    args: [guideId],
  });
  return result.rows.map((r) => tagRow(r as Record<string, unknown>));
}

// ---------- Resources (research corpus) ----------

export type ResourceType = "article" | "video" | "forum_thread" | "docs" | "tool";

export interface Resource {
  id: number;
  title: string;
  url: string;
  source_name: string | null;
  summary: string | null;
  resource_type: ResourceType;
  internal_notes: string | null;
  is_public: number;
  status: GuideStatus;
  created_at: string;
  updated_at: string;
}

function resourceRow(r: Record<string, unknown>): Resource {
  return r as unknown as Resource;
}

export async function listResources(publicOnly = true): Promise<Resource[]> {
  const client = await db();
  const where = publicOnly ? "WHERE is_public = 1 AND status = 'published'" : "";
  const result = await client.execute(`SELECT * FROM resources ${where} ORDER BY created_at DESC`);
  return result.rows.map((r) => resourceRow(r as Record<string, unknown>));
}

export async function getResourceById(id: number): Promise<Resource | undefined> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM resources WHERE id = ?", args: [id] });
  return result.rows[0] ? resourceRow(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function createResource(data: Omit<Resource, "id" | "created_at" | "updated_at">): Promise<Resource> {
  const client = await db();
  const result = await client.execute({
    sql: `INSERT INTO resources (title, url, source_name, summary, resource_type, internal_notes, is_public, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.title, data.url, data.source_name, data.summary, data.resource_type, data.internal_notes, data.is_public, data.status],
  });
  return (await getResourceById(Number(result.lastInsertRowid)))!;
}

export async function updateResource(id: number, data: Partial<Omit<Resource, "id" | "created_at" | "updated_at">>): Promise<Resource> {
  const client = await db();
  const keys = Object.keys(data) as (keyof typeof data)[];
  const fields = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => data[k] ?? null);
  await client.execute({ sql: `UPDATE resources SET ${fields}, updated_at = datetime('now') WHERE id = ?`, args: [...values, id] });
  return (await getResourceById(id))!;
}

export async function deleteResource(id: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM resources WHERE id = ?", args: [id] });
}

export async function getPlatformsForResource(resourceId: number): Promise<Platform[]> {
  const client = await db();
  const result = await client.execute({
    sql: `SELECT p.* FROM platforms p JOIN resource_platforms rp ON rp.platform_id = p.id WHERE rp.resource_id = ? ORDER BY p.name ASC`,
    args: [resourceId],
  });
  return result.rows.map((r) => platformRow(r as Record<string, unknown>));
}

export async function setResourcePlatforms(resourceId: number, platformIds: number[]): Promise<void> {
  const client = await db();
  await client.batch([
    { sql: "DELETE FROM resource_platforms WHERE resource_id = ?", args: [resourceId] },
    ...platformIds.map((platformId) => ({ sql: "INSERT INTO resource_platforms (resource_id, platform_id) VALUES (?, ?)", args: [resourceId, platformId] })),
  ], "write");
}

export async function getResourcesForPlatform(platformSlug: string, publicOnly = true): Promise<Resource[]> {
  const client = await db();
  const where = publicOnly ? "AND r.is_public = 1 AND r.status = 'published'" : "";
  const result = await client.execute({
    sql: `SELECT r.* FROM resources r
          JOIN resource_platforms rp ON rp.resource_id = r.id
          JOIN platforms p ON p.id = rp.platform_id
          WHERE p.slug = ? ${where}
          ORDER BY r.created_at DESC`,
    args: [platformSlug],
  });
  return result.rows.map((r) => resourceRow(r as Record<string, unknown>));
}

export async function setGuideResources(guideId: number, resourceIds: number[]): Promise<void> {
  const client = await db();
  await client.batch([
    { sql: "DELETE FROM guide_resources WHERE guide_id = ?", args: [guideId] },
    ...resourceIds.map((resourceId, i) => ({
      sql: "INSERT INTO guide_resources (guide_id, resource_id, sort_order) VALUES (?, ?, ?)",
      args: [guideId, resourceId, i],
    })),
  ], "write");
}

export async function getResourcesForGuide(guideId: number, publicOnly = true): Promise<Resource[]> {
  const client = await db();
  const where = publicOnly ? "AND r.is_public = 1 AND r.status = 'published'" : "";
  const result = await client.execute({
    sql: `SELECT r.* FROM resources r
          JOIN guide_resources gr ON gr.resource_id = r.id
          WHERE gr.guide_id = ? ${where}
          ORDER BY gr.sort_order ASC`,
    args: [guideId],
  });
  return result.rows.map((r) => resourceRow(r as Record<string, unknown>));
}

// ---------- Quiz responses ----------

export async function logQuizResponse(answers: unknown, recommendation: unknown, sourcePlatform: string | null): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "INSERT INTO quiz_responses (answers, recommendation, source_platform) VALUES (?, ?, ?)",
    args: [JSON.stringify(answers), JSON.stringify(recommendation), sourcePlatform],
  });
}
