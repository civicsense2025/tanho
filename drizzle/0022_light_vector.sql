CREATE TABLE `import_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`imported_at` integer NOT NULL,
	`table_counts` text DEFAULT '{}' NOT NULL,
	`people_count_before` integer DEFAULT 0 NOT NULL,
	`people_count_after` integer DEFAULT 0 NOT NULL,
	`membership_count_before` integer DEFAULT 0 NOT NULL,
	`membership_count_after` integer DEFAULT 0 NOT NULL,
	`redirect_statuses` text DEFAULT '[]' NOT NULL,
	`unmapped` text DEFAULT '[]' NOT NULL
);
