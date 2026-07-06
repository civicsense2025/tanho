-- Hand-authored migration: FTS5 has no Drizzle schema representation, so
-- this virtual table can't be produced by `drizzle-kit generate` — it is
-- written directly, following the same numbered-migration sequence and
-- applied by the same `db:migrate` command as every generated migration.
-- See src/adapters/search/fts5.ts for the reader/writer.
--
-- Columns: id/type/source_id/path/updated_at/gate_json are UNINDEXED
-- (retrievable, but FTS5 never full-text-matches against them — they are
-- metadata, not search text); only title/body are matched.
CREATE VIRTUAL TABLE `search_index_fts` USING fts5(
	`id` UNINDEXED,
	`type` UNINDEXED,
	`source_id` UNINDEXED,
	`path` UNINDEXED,
	`updated_at` UNINDEXED,
	`gate_json` UNINDEXED,
	`title`,
	`body`
);
