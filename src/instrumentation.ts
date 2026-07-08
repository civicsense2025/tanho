import { resolveEnvPrefix } from "@/lib/env/prefix";
import { runMigrations } from "@/lib/db/migrate";

/**
 * Runs once per Next.js server instance, before any route module is imported.
 * Copies prefixed env vars (e.g. `TANHO_DATABASE_URL`) to their canonical
 * names (`DATABASE_URL`) so the ~57 `process.env.X` reads across the codebase
 * keep working without per-var changes. Canonical names always win.
 *
 * This covers SERVER-runtime reads only. `NEXT_PUBLIC_*` vars are inlined by
 * Next at BUILD time, so those are resolved separately in `next.config.ts`.
 * See src/lib/env/prefix.ts for the full resolution rules (ENV_PREFIX wins,
 * else auto-detect from `*_DATABASE_URL` / `*_APP_URL`).
 */
export async function register(): Promise<void> {
  resolveEnvPrefix();
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await runMigrations();
  }
}
