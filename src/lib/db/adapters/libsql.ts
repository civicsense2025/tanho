import { createClient, type Client, type InValue } from "@libsql/client";
import { randomUUID } from "crypto";
import type {
  Award,
  DbAdapter,
  Education,
  Experience,
  ListQuery,
  Project,
  ProjectBlock,
  Repository,
  Skill,
} from "../types";
import { applyMigrations } from "../migrate-runner";
import { libsqlMigrations } from "../migrations/libsql";

/** Maps camelCase TS field names to this table's snake_case SQL columns. */
type ColumnMap<T> = { [K in keyof Omit<T, "id">]: string };

function sqlRepository<T extends { id: string }>(
  client: Client,
  table: string,
  columns: ColumnMap<T>
): Repository<T> {
  const fields = Object.keys(columns) as (keyof Omit<T, "id">)[];
  const colFor = (f: keyof Omit<T, "id">) => columns[f];

  function fromRow(row: Record<string, unknown>): T {
    const out: Record<string, unknown> = { id: row.id };
    for (const f of fields) out[f as string] = row[colFor(f)];
    return out as T;
  }

  return {
    async list(query?: ListQuery<T>) {
      const clauses: string[] = [];
      const args: InValue[] = [];
      if (query?.where) {
        for (const [key, value] of Object.entries(query.where)) {
          const col = key === "id" ? "id" : colFor(key as keyof Omit<T, "id">);
          if (value && typeof value === "object" && "in" in (value as object)) {
            const list = (value as { in: InValue[] }).in;
            clauses.push(`${col} IN (${list.map(() => "?").join(",")})`);
            args.push(...list);
          } else {
            clauses.push(`${col} = ?`);
            args.push(value as InValue);
          }
        }
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const order = query?.orderBy?.length
        ? `ORDER BY ${query.orderBy
            .map((o) => `${o.field === "id" ? "id" : colFor(o.field as keyof Omit<T, "id">)} ${o.direction.toUpperCase()}`)
            .join(", ")}`
        : "";
      const limit = query?.limit ? `LIMIT ${query.limit}` : "";
      const offset = query?.offset ? `OFFSET ${query.offset}` : "";
      const result = await client.execute({
        sql: `SELECT * FROM ${table} ${where} ${order} ${limit} ${offset}`,
        args,
      });
      return result.rows.map((r) => fromRow(r as Record<string, unknown>));
    },

    async get(id: string) {
      const result = await client.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] });
      return result.rows[0] ? fromRow(result.rows[0] as Record<string, unknown>) : undefined;
    },

    async create(data) {
      const id = randomUUID();
      const now = new Date().toISOString();
      const insertCols = fields.map(colFor);
      const insertVals: InValue[] = fields.map((f) => {
        if (f === "createdAt" || f === "updatedAt") return now;
        return ((data as Record<string, unknown>)[f as string] ?? null) as InValue;
      });
      await client.execute({
        sql: `INSERT INTO ${table} (id, ${insertCols.join(", ")}) VALUES (?, ${insertCols.map(() => "?").join(", ")})`,
        args: [id, ...insertVals],
      });
      return (await this.get(id))!;
    },

    async update(id: string, data) {
      const keys = Object.keys(data) as (keyof Omit<T, "id">)[];
      const setCols = keys.map((k) => `${colFor(k)} = ?`);
      const setVals: InValue[] = keys.map((k) => ((data as Record<string, unknown>)[k as string] ?? null) as InValue);
      if (fields.includes("updatedAt" as never)) {
        setCols.push(`${colFor("updatedAt" as keyof Omit<T, "id">)} = ?`);
        setVals.push(new Date().toISOString());
      }
      await client.execute({
        sql: `UPDATE ${table} SET ${setCols.join(", ")} WHERE id = ?`,
        args: [...setVals, id],
      });
      return (await this.get(id))!;
    },

    async delete(id: string) {
      await client.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] });
    },
  };
}

export function createLibsqlAdapter(): DbAdapter {
  const url = process.env.TURSO_DATABASE_URL || "file:./db/portfolio.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });

  const projects = sqlRepository<Project>(client, "projects", {
    slug: "slug",
    title: "title",
    tagline: "tagline",
    description: "description",
    coverImage: "cover_image",
    logoUrl: "logo_url",
    tags: "tags",
    githubUrl: "github_url",
    liveUrl: "live_url",
    year: "year",
    status: "status",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const experience = sqlRepository<Experience>(client, "experience", {
    company: "company",
    role: "role",
    description: "description",
    startDate: "start_date",
    endDate: "end_date",
    current: "current",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const skills = sqlRepository<Skill>(client, "skills", {
    name: "name",
    category: "category",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const awards = sqlRepository<Award>(client, "awards", {
    title: "title",
    organization: "organization",
    description: "description",
    date: "date",
    url: "url",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const education = sqlRepository<Education>(client, "education", {
    school: "school",
    degree: "degree",
    span: "span",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  async function getProjectBlocks(projectId: string): Promise<ProjectBlock[]> {
    const result = await client.execute({
      sql: "SELECT * FROM project_blocks WHERE project_id = ? ORDER BY sort_order ASC",
      args: [projectId],
    });
    return result.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        projectId: String(row.project_id),
        type: row.type as ProjectBlock["type"],
        content: row.content as string,
        sortOrder: Number(row.sort_order),
      };
    });
  }

  async function replaceProjectBlocks(projectId: string, blocks: Omit<ProjectBlock, "id" | "projectId">[]): Promise<void> {
    await client.batch(
      [
        { sql: "DELETE FROM project_blocks WHERE project_id = ?", args: [projectId] },
        ...blocks.map((b, i) => ({
          sql: "INSERT INTO project_blocks (id, project_id, type, content, sort_order) VALUES (?, ?, ?, ?, ?)",
          args: [randomUUID(), projectId, b.type, b.content, i],
        })),
      ],
      "write"
    );
  }

  return {
    projects,
    experience,
    skills,
    awards,
    education,
    getProjectBlocks,
    replaceProjectBlocks,
    migrate: () => applyMigrations(client, libsqlMigrations),
  };
}
