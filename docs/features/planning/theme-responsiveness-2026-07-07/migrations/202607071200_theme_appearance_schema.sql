-- ============================================================
-- Migration: theme appearance settings
-- Date: 2026-07-07
-- Author: Devin (thought-ideation)
--
-- Adds an "appearance" namespace row to the settings table for
-- site-wide theme mode preference (light | dark | system).
--
-- No new table: the platform uses a single `settings` table keyed
-- by namespace with a JSON `data` column (see src/modules/settings/
-- schema.ts). This migration only seeds the default appearance row.
--
-- NOTE: This codebase seeds settings rows via TypeScript seed
-- loaders (seed/), not via SQL migrations — Drizzle migrations are
-- DDL-only here. Treat this SQL as the illustrative equivalent; the
-- actual seed should be added as a loader that upserts the
-- 'appearance' namespace with { siteMode: "system" }. The Zod
-- `.default("system")` in validation.ts makes the value safe even
-- if the row is absent.
--
-- The `theme` table is NOT modified: mode is an activation
-- preference, not a design token. Theme stays purely descriptive
-- (colors/type/spacing); appearance selects which derived set applies.
--
-- Per-section `mode` overrides live in block_trees JSON (Zod
-- `.default("auto")`), so no DDL is needed for them.
--
-- updated_at is milliseconds (schema uses Date.now()), hence
-- unixepoch() * 1000.
-- ============================================================

INSERT INTO settings (namespace, data, updated_at)
VALUES (
  'appearance',
  json('{"siteMode":"system"}'),
  unixepoch() * 1000
)
ON CONFLICT(namespace) DO NOTHING;
