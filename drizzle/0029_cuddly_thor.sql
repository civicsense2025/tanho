ALTER TABLE `custom_types` ADD `permalink_pattern` text DEFAULT '{base}/{slug}' NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_types` ADD `is_hierarchical` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `redirects` ADD `match_type` text DEFAULT 'exact' NOT NULL;--> statement-breakpoint
ALTER TABLE `redirects` ADD `kind` text DEFAULT 'redirect' NOT NULL;--> statement-breakpoint
ALTER TABLE `redirects` ADD `pattern` text;--> statement-breakpoint
ALTER TABLE `redirects` ADD `destination` text;--> statement-breakpoint
ALTER TABLE `redirects` ADD `case_sensitive` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `redirects` ADD `preserve_query` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `redirects` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `redirects` ADD `enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `redirects` ADD `group_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `redirects` ADD `conditions` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `redirects` ADD `hit_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `redirects` ADD `last_at` integer;--> statement-breakpoint
ALTER TABLE `redirects` ADD `source_batch` text;--> statement-breakpoint
ALTER TABLE `redirects` ADD `auto_created_from` text;--> statement-breakpoint
CREATE INDEX `redirects_enabled_pos_idx` ON `redirects` (`enabled`,`position`);--> statement-breakpoint
CREATE INDEX `redirects_batch_idx` ON `redirects` (`source_batch`);