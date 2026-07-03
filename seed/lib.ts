import { mkdirSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/lib/db/schema";

/** Standalone DB handle for seed scripts (no Next.js runtime). */
export function seedDb() {
  const url = process.env.DATABASE_URL ?? "file:./data/dev.db";
  if (url.startsWith("file:")) mkdirSync("./data", { recursive: true });
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return drizzle(client, { schema });
}

export type SeedDb = ReturnType<typeof seedDb>;

export const log = (msg: string) => console.log(`[seed] ${msg}`);
