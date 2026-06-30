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

    CREATE TABLE IF NOT EXISTS experience (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      company     TEXT    NOT NULL,
      role        TEXT    NOT NULL,
      description TEXT,
      start_date  TEXT,
      end_date    TEXT,
      current     INTEGER NOT NULL DEFAULT 0,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skills (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      category    TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS awards (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      organization TEXT,
      description TEXT,
      date        TEXT,
      url         TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS education (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      school      TEXT    NOT NULL,
      degree      TEXT,
      span        TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
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

export interface Experience {
  id: number;
  company: string;
  role: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  current: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string | null;
  sort_order: number;
  created_at: string;
}

export interface Award {
  id: number;
  title: string;
  organization: string | null;
  description: string | null;
  date: string | null;
  url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Education {
  id: number;
  school: string;
  degree: string | null;
  span: string | null;
  sort_order: number;
  created_at: string;
}

function row(r: Record<string, unknown>): Project {
  return r as unknown as Project;
}

function blockRow(r: Record<string, unknown>): ProjectBlock {
  return r as unknown as ProjectBlock;
}

function experienceRow(r: Record<string, unknown>): Experience {
  return r as unknown as Experience;
}

function skillRow(r: Record<string, unknown>): Skill {
  return r as unknown as Skill;
}

function awardRow(r: Record<string, unknown>): Award {
  return r as unknown as Award;
}

function educationRow(r: Record<string, unknown>): Education {
  return r as unknown as Education;
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

export async function listExperience(): Promise<Experience[]> {
  const client = await db();
  const result = await client.execute("SELECT * FROM experience ORDER BY sort_order ASC, id DESC");
  return result.rows.map((r) => experienceRow(r as Record<string, unknown>));
}

export async function getExperienceById(id: number): Promise<Experience | undefined> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM experience WHERE id = ?", args: [id] });
  return result.rows[0] ? experienceRow(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function createExperience(data: Omit<Experience, "id" | "created_at" | "updated_at">): Promise<Experience> {
  const client = await db();
  const result = await client.execute({
    sql: `INSERT INTO experience (company, role, description, start_date, end_date, current, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [data.company, data.role, data.description, data.start_date, data.end_date, data.current, data.sort_order],
  });
  const id = Number(result.lastInsertRowid);
  const rowResult = await client.execute({ sql: "SELECT * FROM experience WHERE id = ?", args: [id] });
  return experienceRow(rowResult.rows[0] as Record<string, unknown>);
}

export async function updateExperience(id: number, data: Partial<Omit<Experience, "id" | "created_at" | "updated_at">>): Promise<Experience> {
  const client = await db();
  const keys = Object.keys(data) as (keyof typeof data)[];
  const fields = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => data[k] ?? null);
  await client.execute({ sql: `UPDATE experience SET ${fields}, updated_at = datetime('now') WHERE id = ?`, args: [...values, id] });
  const rowResult = await client.execute({ sql: "SELECT * FROM experience WHERE id = ?", args: [id] });
  return experienceRow(rowResult.rows[0] as Record<string, unknown>);
}

export async function deleteExperience(id: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM experience WHERE id = ?", args: [id] });
}

export async function listSkills(): Promise<Skill[]> {
  const client = await db();
  const result = await client.execute("SELECT * FROM skills ORDER BY sort_order ASC, id ASC");
  return result.rows.map((r) => skillRow(r as Record<string, unknown>));
}

export async function getSkillById(id: number): Promise<Skill | undefined> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM skills WHERE id = ?", args: [id] });
  return result.rows[0] ? skillRow(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function createSkill(data: Omit<Skill, "id" | "created_at">): Promise<Skill> {
  const client = await db();
  const result = await client.execute({
    sql: `INSERT INTO skills (name, category, sort_order) VALUES (?, ?, ?)`,
    args: [data.name, data.category, data.sort_order],
  });
  const id = Number(result.lastInsertRowid);
  const rowResult = await client.execute({ sql: "SELECT * FROM skills WHERE id = ?", args: [id] });
  return skillRow(rowResult.rows[0] as Record<string, unknown>);
}

export async function updateSkill(id: number, data: Partial<Omit<Skill, "id" | "created_at">>): Promise<Skill> {
  const client = await db();
  const keys = Object.keys(data) as (keyof typeof data)[];
  const fields = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => data[k] ?? null);
  await client.execute({ sql: `UPDATE skills SET ${fields} WHERE id = ?`, args: [...values, id] });
  const rowResult = await client.execute({ sql: "SELECT * FROM skills WHERE id = ?", args: [id] });
  return skillRow(rowResult.rows[0] as Record<string, unknown>);
}

export async function deleteSkill(id: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM skills WHERE id = ?", args: [id] });
}

export async function listAwards(): Promise<Award[]> {
  const client = await db();
  const result = await client.execute("SELECT * FROM awards ORDER BY sort_order ASC, id DESC");
  return result.rows.map((r) => awardRow(r as Record<string, unknown>));
}

export async function getAwardById(id: number): Promise<Award | undefined> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM awards WHERE id = ?", args: [id] });
  return result.rows[0] ? awardRow(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function createAward(data: Omit<Award, "id" | "created_at">): Promise<Award> {
  const client = await db();
  const result = await client.execute({
    sql: `INSERT INTO awards (title, organization, description, date, url, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [data.title, data.organization, data.description, data.date, data.url, data.sort_order],
  });
  const id = Number(result.lastInsertRowid);
  const rowResult = await client.execute({ sql: "SELECT * FROM awards WHERE id = ?", args: [id] });
  return awardRow(rowResult.rows[0] as Record<string, unknown>);
}

export async function updateAward(id: number, data: Partial<Omit<Award, "id" | "created_at">>): Promise<Award> {
  const client = await db();
  const keys = Object.keys(data) as (keyof typeof data)[];
  const fields = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => data[k] ?? null);
  await client.execute({ sql: `UPDATE awards SET ${fields} WHERE id = ?`, args: [...values, id] });
  const rowResult = await client.execute({ sql: "SELECT * FROM awards WHERE id = ?", args: [id] });
  return awardRow(rowResult.rows[0] as Record<string, unknown>);
}

export async function deleteAward(id: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM awards WHERE id = ?", args: [id] });
}

export async function listEducation(): Promise<Education[]> {
  const client = await db();
  const result = await client.execute("SELECT * FROM education ORDER BY sort_order ASC, id DESC");
  return result.rows.map((r) => educationRow(r as Record<string, unknown>));
}

export async function getEducationById(id: number): Promise<Education | undefined> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT * FROM education WHERE id = ?", args: [id] });
  return result.rows[0] ? educationRow(result.rows[0] as Record<string, unknown>) : undefined;
}

export async function createEducation(data: Omit<Education, "id" | "created_at">): Promise<Education> {
  const client = await db();
  const result = await client.execute({
    sql: `INSERT INTO education (school, degree, span, sort_order) VALUES (?, ?, ?, ?)`,
    args: [data.school, data.degree, data.span, data.sort_order],
  });
  const id = Number(result.lastInsertRowid);
  const rowResult = await client.execute({ sql: "SELECT * FROM education WHERE id = ?", args: [id] });
  return educationRow(rowResult.rows[0] as Record<string, unknown>);
}

export async function updateEducation(id: number, data: Partial<Omit<Education, "id" | "created_at">>): Promise<Education> {
  const client = await db();
  const keys = Object.keys(data) as (keyof typeof data)[];
  const fields = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => data[k] ?? null);
  await client.execute({ sql: `UPDATE education SET ${fields} WHERE id = ?`, args: [...values, id] });
  const rowResult = await client.execute({ sql: "SELECT * FROM education WHERE id = ?", args: [id] });
  return educationRow(rowResult.rows[0] as Record<string, unknown>);
}

export async function deleteEducation(id: number): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM education WHERE id = ?", args: [id] });
}
