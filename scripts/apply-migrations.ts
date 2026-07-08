import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrations = [
  "0032_sudden_miss_america.sql",
  "0033_team-management.sql",
  "0034_parallel_blonde_phantom.sql",
  "0035_organic_hydra.sql",
  "0036_messy_puff_adder.sql",
];

async function applyMigrations() {
  for (const file of migrations) {
    const sql = readFileSync(join("drizzle", file), "utf-8");
    console.log(`Applying ${file}...`);
    await client.execute(sql);
    console.log(`✓ ${file}`);
  }
  console.log("All migrations applied");
}

applyMigrations().catch(console.error);
