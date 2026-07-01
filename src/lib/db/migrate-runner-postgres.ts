import type { Sql } from "postgres";

export interface PostgresMigration {
  name: string;
  sql: string;
  /** See SqlMigration.guard in migrate-runner.ts -- same rationale, postgres client instead. */
  guard?: (sql: Sql) => Promise<boolean>;
}

export async function applyPostgresMigrations(sql: Sql, migrations: PostgresMigration[]): Promise<void> {
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
    if (!migration.guard || (await migration.guard(sql))) {
      await sql.unsafe(migration.sql);
    }
    await sql.unsafe("INSERT INTO _migrations (name) VALUES ($1)", [migration.name]);
  }
}

/** Reusable guard: true only if every named table currently exists. */
export async function tablesExist(sql: Sql, tableNames: string[]): Promise<boolean> {
  const rows = await sql.unsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [tableNames]
  );
  return rows.length === tableNames.length;
}
