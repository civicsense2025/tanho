import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dataSourceConnections, type DataSourceConnectionRow } from "./schema";

/** Non-secret projection for admin list/detail screens — never includes `configEncrypted`. */
export type DataSourceConnectionSummary = Omit<DataSourceConnectionRow, "configEncrypted">;

function toSummary(row: DataSourceConnectionRow): DataSourceConnectionSummary {
  const { configEncrypted: _configEncrypted, ...summary } = row;
  return summary;
}

/** Owner-facing list — no callers outside owner-gated actions/screens should reach this. */
export async function listConnections(): Promise<DataSourceConnectionSummary[]> {
  const rows = await db.query.dataSourceConnections.findMany({
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });
  return rows.map(toSummary);
}

/** Full row INCLUDING the sealed config — only for server-action/resolver use, never rendered as-is. */
export async function getConnection(id: string): Promise<DataSourceConnectionRow | null> {
  const row = await db.query.dataSourceConnections.findFirst({
    where: eq(dataSourceConnections.id, id),
  });
  return row ?? null;
}

/** Summary-only lookup for admin screens that must never see the sealed config. */
export async function getConnectionSummary(id: string): Promise<DataSourceConnectionSummary | null> {
  const row = await getConnection(id);
  return row ? toSummary(row) : null;
}
