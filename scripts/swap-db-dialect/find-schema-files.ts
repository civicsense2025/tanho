import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Recursively finds *schema*.ts files under src/modules. Files that don't
 * import drizzle-orm/sqlite-core (zod-only settings schemas, entity
 * schemas, etc.) are matched here but skipped by convertSchemaFile. */
export function findSchemaFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...findSchemaFiles(full));
    } else if (/schema.*\.ts$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}
