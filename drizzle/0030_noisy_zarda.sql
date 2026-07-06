CREATE TABLE `import_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text DEFAULT 'generic' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`control_mode` text DEFAULT 'auto' NOT NULL,
	`confirmed` integer DEFAULT false NOT NULL,
	`plan` text NOT NULL,
	`types_created` text DEFAULT '[]' NOT NULL,
	`rows_total` integer DEFAULT 0 NOT NULL,
	`rows_done` integer DEFAULT 0 NOT NULL,
	`row_cursor` integer DEFAULT 0 NOT NULL,
	`redirects_done` integer DEFAULT 0 NOT NULL,
	`errors` text DEFAULT '[]' NOT NULL,
	`source_batch` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `import_jobs_status_idx` ON `import_jobs` (`status`);