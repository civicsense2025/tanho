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

export const db = drizzle(client, { schema });
export type Db = typeof db;
