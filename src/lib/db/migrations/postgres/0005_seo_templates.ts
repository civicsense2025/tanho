// Default templates seeded once; admins edit them afterward via /admin/seo. IDs are fixed UUIDs
// so this migration is idempotent even if it needed to be re-run against a fresh DB.
export const sql = `
CREATE TABLE IF NOT EXISTS seo_templates (
  id                    TEXT NOT NULL PRIMARY KEY,
  entity_type           TEXT NOT NULL UNIQUE,
  title_template        TEXT NOT NULL DEFAULT '',
  description_template  TEXT NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO seo_templates (id, entity_type, title_template, description_template) VALUES
  ('00000000-0000-4000-8000-000000000001', 'project', '{{title}} — Tan Ho', '{{tagline}}'),
  ('00000000-0000-4000-8000-000000000002', 'guide', '{{title}} — Migration Guide', '{{summary}}'),
  ('00000000-0000-4000-8000-000000000003', 'resource', '{{title}}', '{{summary}}'),
  ('00000000-0000-4000-8000-000000000004', 'page', '{{title}} — Tan Ho', '{{title}}')
ON CONFLICT (entity_type) DO NOTHING;
`;
