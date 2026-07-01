import type { Client } from "@libsql/client";

export interface SqlMigration {
  name: string;
  sql: string;
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
    await client.executeMultiple(migration.sql);
    await client.execute({ sql: "INSERT OR IGNORE INTO _migrations (name) VALUES (?)", args: [migration.name] });
  }
}
