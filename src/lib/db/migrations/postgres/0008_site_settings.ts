// No seed rows -- absence of a row for a given key means "use the built-in default" (see
// src/lib/settings.ts). value holds ciphertext (see src/lib/crypto.ts) when is_secret=1.
export const sql = `
CREATE TABLE IF NOT EXISTS site_settings (
  id          TEXT NOT NULL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT,
  is_secret   INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;
