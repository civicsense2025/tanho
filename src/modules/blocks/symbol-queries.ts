import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import { symbols, type SymbolRow } from "./schema";

/**
 * Load a symbol definition by id — cached (revalidated by the `symbols:<id>` tag
 * whenever the definition is saved, which is what makes linked instances update).
 * Server-only: imported by the render walker, never the client editor. Returns
 * null for a missing/deleted symbol so the walker can render a placeholder rather
 * than throw.
 */
export async function loadSymbol(id: string): Promise<SymbolRow | null> {
  "use cache";
  cacheLife("max");
  cacheTag("symbols", `symbols:${id}`);
  if (!id) return null;
  const row = await db.query.symbols.findFirst({ where: eq(symbols.id, id) });
  return row ?? null;
}
