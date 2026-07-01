export const sql = `
CREATE TABLE IF NOT EXISTS posts (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  subtitle         TEXT,
  excerpt          TEXT,
  cover_image      TEXT,
  status           TEXT NOT NULL DEFAULT 'draft',
  visibility       TEXT NOT NULL DEFAULT 'public',
  published_at     TIMESTAMPTZ,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  seo_title        TEXT,
  seo_description  TEXT,
  og_image         TEXT,
  canonical_url    TEXT,
  no_index         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscribers (
  id                 TEXT PRIMARY KEY,
  email              TEXT NOT NULL UNIQUE,
  status             TEXT NOT NULL DEFAULT 'pending',
  confirm_token      TEXT,
  unsubscribe_token  TEXT NOT NULL,
  source             TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsub ON subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirm ON subscribers(confirm_token);

CREATE TABLE IF NOT EXISTS post_deliveries (
  id                   TEXT PRIMARY KEY,
  post_id              TEXT NOT NULL,
  subscriber_id        TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'queued',
  provider_message_id  TEXT,
  sent_at              TIMESTAMPTZ,
  error                TEXT,
  UNIQUE(post_id, subscriber_id)
);
CREATE INDEX IF NOT EXISTS idx_deliveries_post ON post_deliveries(post_id);

INSERT INTO seo_templates (id, entity_type, title_template, description_template) VALUES
  ('00000000-0000-4000-8000-000000000005', 'post', '{{title}}', '{{excerpt}}')
ON CONFLICT (entity_type) DO NOTHING;
`;
