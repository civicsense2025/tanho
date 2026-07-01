import postgres, { type Sql } from "postgres";
import { randomUUID } from "crypto";
import type {
  Award,
  DbAdapter,
  Education,
  Experience,
  ListQuery,
  Page,
  Project,
  ProjectBlock,
  Repository,
  Skill,
} from "../types";
import { applyPostgresMigrations } from "../migrate-runner-postgres";
import { postgresMigrations } from "../migrations/postgres";

/** Maps camelCase TS field names to this table's snake_case SQL columns. */
type ColumnMap<T> = { [K in keyof Omit<T, "id">]: string };

function sqlRepository<T extends { id: string }>(
  sql: Sql,
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
      const args: unknown[] = [];
      let paramIndex = 1;
      if (query?.where) {
        for (const [key, value] of Object.entries(query.where)) {
          const col = key === "id" ? "id" : colFor(key as keyof Omit<T, "id">);
          if (value && typeof value === "object" && "in" in (value as object)) {
            const list = (value as { in: unknown[] }).in;
            const placeholders = list.map(() => `$${paramIndex++}`).join(",");
            clauses.push(`${col} IN (${placeholders})`);
            args.push(...list);
          } else {
            clauses.push(`${col} = $${paramIndex++}`);
            args.push(value);
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
      const rows = await sql.unsafe<Record<string, unknown>[]>(
        `SELECT * FROM ${table} ${where} ${order} ${limit} ${offset}`,
        args as never[]
      );
      return rows.map(fromRow);
    },

    async get(id: string) {
      const rows = await sql.unsafe<Record<string, unknown>[]>(`SELECT * FROM ${table} WHERE id = $1`, [id] as never[]);
      return rows[0] ? fromRow(rows[0]) : undefined;
    },

    async create(data) {
      const id = randomUUID();
      const now = new Date().toISOString();
      const insertCols = fields.map(colFor);
      const insertVals = fields.map((f) => {
        if (f === "createdAt" || f === "updatedAt") return now;
        return (data as Record<string, unknown>)[f as string] ?? null;
      });
      const placeholders = [id, ...insertVals].map((_, i) => `$${i + 1}`).join(", ");
      await sql.unsafe(
        `INSERT INTO ${table} (id, ${insertCols.join(", ")}) VALUES (${placeholders})`,
        [id, ...insertVals] as never[]
      );
      return (await this.get(id))!;
    },

    async update(id: string, data) {
      const keys = Object.keys(data) as (keyof Omit<T, "id">)[];
      const setVals = keys.map((k) => (data as Record<string, unknown>)[k as string] ?? null);
      if (fields.includes("updatedAt" as never)) {
        keys.push("updatedAt" as keyof Omit<T, "id">);
        setVals.push(new Date().toISOString());
      }
      const setCols = keys.map((k, i) => `${colFor(k)} = $${i + 1}`);
      await sql.unsafe(
        `UPDATE ${table} SET ${setCols.join(", ")} WHERE id = $${keys.length + 1}`,
        [...setVals, id] as never[]
      );
      return (await this.get(id))!;
    },

    async delete(id: string) {
      await sql.unsafe(`DELETE FROM ${table} WHERE id = $1`, [id] as never[]);
    },
  };
}

export function createPostgresAdapter(): DbAdapter {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("POSTGRES_URL or DATABASE_URL must be set when DB_PROVIDER=postgres");
  const sql = postgres(url);

  const projects = sqlRepository<Project>(sql, "projects", {
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

  const experience = sqlRepository<Experience>(sql, "experience", {
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

  const skills = sqlRepository<Skill>(sql, "skills", {
    name: "name",
    category: "category",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const awards = sqlRepository<Award>(sql, "awards", {
    title: "title",
    organization: "organization",
    description: "description",
    date: "date",
    url: "url",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const education = sqlRepository<Education>(sql, "education", {
    school: "school",
    degree: "degree",
    span: "span",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const pages = sqlRepository<Page>(sql, "pages", {
    slug: "slug",
    title: "title",
    route: "route",
    status: "status",
    sortOrder: "sort_order",
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  async function getProjectBlocks(projectId: string): Promise<ProjectBlock[]> {
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM project_blocks WHERE project_id = $1 ORDER BY sort_order ASC",
      [projectId] as never[]
    );
    return rows.map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      type: row.type as ProjectBlock["type"],
      content: row.content as string,
      sortOrder: Number(row.sort_order),
    }));
  }

  async function replaceProjectBlocks(projectId: string, blocks: Omit<ProjectBlock, "id" | "projectId">[]): Promise<void> {
    await sql.begin(async (tx) => {
      await tx.unsafe("DELETE FROM project_blocks WHERE project_id = $1", [projectId] as never[]);
      for (const [i, b] of blocks.entries()) {
        await tx.unsafe(
          "INSERT INTO project_blocks (id, project_id, type, content, sort_order) VALUES ($1, $2, $3, $4, $5)",
          [randomUUID(), projectId, b.type, b.content, i] as never[]
        );
      }
    });
  }

  return {
    projects,
    experience,
    skills,
    awards,
    education,
    pages,
    getProjectBlocks,
    replaceProjectBlocks,
    migrate: () => applyPostgresMigrations(sql, postgresMigrations),
  };
}
