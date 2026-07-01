import type { DbAdapter } from "./types";
import { createLibsqlAdapter } from "./adapters/libsql";

function selectAdapter(): DbAdapter {
  const provider = process.env.DB_PROVIDER || "turso";
  switch (provider) {
    case "turso":
    case "libsql":
      return createLibsqlAdapter();
    default:
      throw new Error(`Unknown DB_PROVIDER: ${provider}`);
  }
}

let _adapter: DbAdapter | null = null;
let _migration: Promise<void> | null = null;

export async function getAdapter(): Promise<DbAdapter> {
  if (!_adapter) _adapter = selectAdapter();
  // Concurrent callers (e.g. parallel data fetches on the same cold start) must
  // await the same in-flight migration run rather than each kicking off their
  // own — a second run would race the first and fail on the now-inserted
  // _migrations primary key.
  if (!_migration) _migration = _adapter.migrate();
  await _migration;
  return _adapter;
}
