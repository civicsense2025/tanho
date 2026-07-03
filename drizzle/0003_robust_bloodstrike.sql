CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_key` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`w` integer,
	`h` integer,
	`alt` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`credit` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`license` text DEFAULT 'unknown' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_storage_key_unique` ON `media` (`storage_key`);--> statement-breakpoint
CREATE TABLE `media_usage` (
	`media_id` text NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`where_label` text NOT NULL,
	`route` text NOT NULL,
	PRIMARY KEY(`media_id`, `owner_type`, `owner_id`, `where_label`)
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL
);
