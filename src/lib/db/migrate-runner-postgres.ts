import type { Sql } from "postgres";
import type { SqlMigration } from "./migrate-runner";

export async function applyPostgresMigrations(sql: Sql, migrations: SqlMigration[]): Promise<void> {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const applied = await sql.unsafe<{ name: string }[]>("SELECT name FROM _migrations");
  const appliedNames = new Set(applied.map((r) => r.name));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) continue;
    await sql.unsafe(migration.sql);
    await sql.unsafe("INSERT INTO _migrations (name) VALUES ($1)", [migration.name]);
  }
}
