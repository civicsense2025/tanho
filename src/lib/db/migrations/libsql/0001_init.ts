export const sql = `
CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  title       TEXT    NOT NULL,
  tagline     TEXT,
  description TEXT,
  cover_image TEXT,
  logo_url    TEXT,
  tags        TEXT    DEFAULT '[]',
  github_url  TEXT,
  live_url    TEXT,
  year        INTEGER,
  status      TEXT    NOT NULL DEFAULT 'draft',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_blocks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL,
  content     TEXT    NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS experience (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  company     TEXT    NOT NULL,
  role        TEXT    NOT NULL,
  description TEXT,
  start_date  TEXT,
  end_date    TEXT,
  current     INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  category    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS awards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  organization TEXT,
  description TEXT,
  date        TEXT,
  url         TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS education (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  school      TEXT    NOT NULL,
  degree      TEXT,
  span        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
`;
