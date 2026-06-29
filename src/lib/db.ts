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
    sql: `INSERT INTO projects (slug, title, tagline, description, cover_image, tags, github_url, live_url, year, status, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [data.slug, data.title, data.tagline, data.description, data.cover_image, data.tags, data.github_url, data.live_url, data.year, data.status, data.sort_order],
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
