export const sql = `
CREATE TABLE IF NOT EXISTS content_types (
  id                          TEXT    PRIMARY KEY,
  slug                        TEXT    NOT NULL UNIQUE,
  name                        TEXT    NOT NULL,
  icon                        TEXT,
  fields                      TEXT    NOT NULL DEFAULT '[]',
  is_built_in                 INTEGER NOT NULL DEFAULT 0,
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  seo_title_template          TEXT,
  seo_description_template    TEXT,
  created_at                  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_entries (
  id                TEXT    PRIMARY KEY,
  content_type_id   TEXT    NOT NULL REFERENCES content_types(id) ON DELETE CASCADE,
  slug              TEXT    NOT NULL,
  title             TEXT    NOT NULL,
  status            TEXT    NOT NULL DEFAULT 'draft',
  scheduled_at      TEXT,
  published_at      TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  seo_title         TEXT,
  seo_description   TEXT,
  og_image          TEXT,
  canonical_url     TEXT,
  no_index          INTEGER NOT NULL DEFAULT 0,
  data              TEXT    NOT NULL DEFAULT '{}',
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(content_type_id, slug)
);

CREATE TABLE IF NOT EXISTS collections (
  id           TEXT    PRIMARY KEY,
  slug         TEXT    NOT NULL UNIQUE,
  name         TEXT    NOT NULL,
  description  TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_entry_collections (
  id                TEXT    PRIMARY KEY,
  content_entry_id  TEXT    NOT NULL REFERENCES content_entries(id) ON DELETE CASCADE,
  collection_id     TEXT    NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(content_entry_id, collection_id)
);

CREATE TABLE IF NOT EXISTS content_entry_tags (
  id                TEXT    PRIMARY KEY,
  content_entry_id  TEXT    NOT NULL REFERENCES content_entries(id) ON DELETE CASCADE,
  tag_id            TEXT    NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(content_entry_id, tag_id)
);
`;
