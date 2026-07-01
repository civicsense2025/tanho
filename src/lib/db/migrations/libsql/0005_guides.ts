export const sql = `
CREATE TABLE IF NOT EXISTS platforms (
  id              TEXT    PRIMARY KEY,
  slug            TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  kind            TEXT    NOT NULL DEFAULT 'both',
  category        TEXT,
  logo_url        TEXT,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  official_url    TEXT,
  is_open_source  INTEGER NOT NULL DEFAULT 0,
  pricing_model   TEXT,
  pricing_notes   TEXT,
  github_url      TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id   TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guides (
  id                TEXT    PRIMARY KEY,
  slug              TEXT    NOT NULL UNIQUE,
  title             TEXT    NOT NULL,
  tagline           TEXT,
  summary           TEXT,
  source_platform   TEXT    NOT NULL,
  target_platform   TEXT    NOT NULL,
  difficulty        TEXT    NOT NULL DEFAULT 'intermediate',
  effort_hours_min  INTEGER,
  effort_hours_max  INTEGER,
  cost_min_usd      INTEGER,
  cost_max_usd      INTEGER,
  cost_period       TEXT    NOT NULL DEFAULT 'monthly',
  skills_required   TEXT    NOT NULL DEFAULT '[]',
  requirements      TEXT    NOT NULL DEFAULT '[]',
  cover_image       TEXT,
  status            TEXT    NOT NULL DEFAULT 'draft',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  seo_title         TEXT,
  seo_description   TEXT,
  og_image          TEXT,
  canonical_url     TEXT,
  no_index          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guide_steps (
  id          TEXT    PRIMARY KEY,
  guide_id    TEXT    NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  title       TEXT,
  type        TEXT    NOT NULL,
  content     TEXT    NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS guide_tags (
  guide_id TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (guide_id, tag_id)
);

CREATE TABLE IF NOT EXISTS resources (
  id               TEXT    PRIMARY KEY,
  title            TEXT    NOT NULL,
  url              TEXT    NOT NULL,
  source_name      TEXT,
  summary          TEXT,
  resource_type    TEXT    NOT NULL DEFAULT 'article',
  internal_notes   TEXT,
  is_public        INTEGER NOT NULL DEFAULT 1,
  status           TEXT    NOT NULL DEFAULT 'draft',
  seo_title        TEXT,
  seo_description  TEXT,
  og_image         TEXT,
  canonical_url    TEXT,
  no_index         INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resource_platforms (
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  platform_id TEXT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, platform_id)
);

CREATE TABLE IF NOT EXISTS guide_resources (
  guide_id    TEXT    NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  resource_id TEXT    NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guide_id, resource_id)
);

CREATE TABLE IF NOT EXISTS quiz_responses (
  id              TEXT PRIMARY KEY,
  answers         TEXT NOT NULL,
  recommendation  TEXT NOT NULL,
  source_platform TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
