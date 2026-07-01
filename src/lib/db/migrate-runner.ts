import type { Client } from "@libsql/client";

export interface SqlMigration {
  name: string;
  sql: string;
  /** Optional pre-check; if it resolves false, the migration is recorded as applied WITHOUT
   * running `sql`. Exists for migrations whose SQL reads from a table that may not exist by the
   * time this migration finally runs (e.g. a backfill inserted before a later DROP, on a
   * database where that DROP already ran) -- SQL can't portably guard a table reference within
   * one statement, so the check happens here in JS instead. */
  guard?: (client: Client) => Promise<boolean>;
}

export async function applyMigrations(client: Client, migrations: SqlMigration[]): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  const applied = await client.execute("SELECT name FROM _migrations");
  const appliedNames = new Set(applied.rows.map((r) => r.name as string));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) continue;
    if (!migration.guard || (await migration.guard(client))) {
      await client.executeMultiple(migration.sql);
    }
    await client.execute({ sql: "INSERT OR IGNORE INTO _migrations (name) VALUES (?)", args: [migration.name] });
  }
}

/** Reusable guard: true only if every named table currently exists. */
export async function tablesExist(client: Client, tableNames: string[]): Promise<boolean> {
  const result = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${tableNames.map(() => "?").join(",")})`,
    args: tableNames,
  });
  return result.rows.length === tableNames.length;
}
