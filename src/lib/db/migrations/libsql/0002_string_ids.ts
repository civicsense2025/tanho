// SQLite has no ALTER COLUMN; switching id columns from INTEGER AUTOINCREMENT to
// TEXT (UUID) requires the standard rebuild-and-copy pattern. Existing integer ids
// are preserved as their string form (e.g. 3 -> '3') so any external links survive;
// new rows going forward get real UUIDs from application code (see adapters/libsql.ts).
export const sql = `
CREATE TABLE projects_new (
  id          TEXT    PRIMARY KEY,
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
INSERT INTO projects_new SELECT CAST(id AS TEXT), slug, title, tagline, description, cover_image, logo_url, tags, github_url, live_url, year, status, sort_order, created_at, updated_at FROM projects;

CREATE TABLE project_blocks_new (
  id          TEXT    PRIMARY KEY,
  project_id  TEXT    NOT NULL REFERENCES projects_new(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL,
  content     TEXT    NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 0
);
INSERT INTO project_blocks_new SELECT CAST(id AS TEXT), CAST(project_id AS TEXT), type, content, sort_order FROM project_blocks;

CREATE TABLE experience_new (
  id          TEXT    PRIMARY KEY,
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
INSERT INTO experience_new SELECT CAST(id AS TEXT), company, role, description, start_date, end_date, current, sort_order, created_at, updated_at FROM experience;

CREATE TABLE skills_new (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  category    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO skills_new SELECT CAST(id AS TEXT), name, category, sort_order, created_at, created_at FROM skills;

CREATE TABLE awards_new (
  id          TEXT    PRIMARY KEY,
  title       TEXT    NOT NULL,
  organization TEXT,
  description TEXT,
  date        TEXT,
  url         TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO awards_new SELECT CAST(id AS TEXT), title, organization, description, date, url, sort_order, created_at, created_at FROM awards;

CREATE TABLE education_new (
  id          TEXT    PRIMARY KEY,
  school      TEXT    NOT NULL,
  degree      TEXT,
  span        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO education_new SELECT CAST(id AS TEXT), school, degree, span, sort_order, created_at, created_at FROM education;

DROP TABLE project_blocks;
DROP TABLE projects;
DROP TABLE experience;
DROP TABLE skills;
DROP TABLE awards;
DROP TABLE education;

ALTER TABLE projects_new RENAME TO projects;
ALTER TABLE project_blocks_new RENAME TO project_blocks;
ALTER TABLE experience_new RENAME TO experience;
ALTER TABLE skills_new RENAME TO skills;
ALTER TABLE awards_new RENAME TO awards;
ALTER TABLE education_new RENAME TO education;
`;
