import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Single DB entry point. Swapping the database for another Drizzle dialect
// (Postgres, MySQL, plain SQLite) means changing this factory + regenerating
// migrations — queries in src/modules/*/queries.ts survive unchanged.
// See docs/architecture/adapters.md.
const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./data/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Make foreign-key enforcement explicit. Stock SQLite defaults `foreign_keys`
// to OFF (silently disabling ON DELETE CASCADE / SET NULL); libsql defaults it
// ON, but set it here so the behavior doesn't depend on the driver's default.
// For the local file URL the client holds a single connection, so one PRAGMA
// covers it. For a remote Turso URL the HTTP protocol is stateless and the
// PRAGMA won't persist across requests — Turso enforces FKs server-side.
//
// Fire-and-forget (no await): the sqlite3 driver executes synchronously for
// file URLs, so the PRAGMA lands before any query. For Turso it's a no-op
// (FKs enforced server-side). Avoiding top-level await keeps this module
// loadable from tsx/CJS contexts (the seed scripts).
void client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle(client, { schema });
export type Db = typeof db;
