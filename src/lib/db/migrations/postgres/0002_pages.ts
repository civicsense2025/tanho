export const sql = `
CREATE TABLE IF NOT EXISTS pages (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  route       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;
