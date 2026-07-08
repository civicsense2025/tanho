import { db } from "./client";

/**
 * Runs Drizzle database migrations programmatically.
 * Uses dynamic imports to avoid bundling uninstalled drivers (e.g. node-postgres
 * before a dialect swap, or @libsql/client after a dialect swap).
 */
export async function runMigrations(): Promise<void> {
  if (typeof window !== "undefined") return;

  try {
    const path = await import("node:path");
    const migrationsFolder = path.join(process.cwd(), "drizzle");

    // Infer provider dialect from client structure or URL
    const url = process.env.DATABASE_URL || "file:./data/dev.db";
    const isPostgres = url.startsWith("postgres://") || url.startsWith("postgresql://");

    if (isPostgres) {
      console.log("[db] Auto-migration: detected Postgres. Running migrations...");
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(db as any, { migrationsFolder });
    } else {
      console.log("[db] Auto-migration: detected libSQL/SQLite. Running migrations...");
      const { migrate } = await import("drizzle-orm/libsql/migrator");
      await migrate(db as any, { migrationsFolder });
    }
    console.log("[db] Auto-migration: migrations completed successfully.");
  } catch (error) {
    console.error("[db] Auto-migration: migrations failed:", error);
    throw error;
  }
}
