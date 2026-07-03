CREATE TABLE `block_sets` (
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`variant` text NOT NULL,
	`blocks` text DEFAULT '[]' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`saved_at` integer NOT NULL,
	`saved_by` text,
	PRIMARY KEY(`owner_type`, `owner_id`, `variant`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`route` text NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'page' NOT NULL,
	`parent_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` real DEFAULT 0 NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`priority` integer DEFAULT 3 NOT NULL,
	`template` text DEFAULT 'blank' NOT NULL,
	`layout` text DEFAULT '{}' NOT NULL,
	`seo_title` text DEFAULT '' NOT NULL,
	`seo_description` text DEFAULT '' NOT NULL,
	`og_image_media_id` text,
	`canonical_url` text DEFAULT '' NOT NULL,
	`no_index` integer DEFAULT false NOT NULL,
	`has_paywall` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_unique` ON `pages` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `pages_route_unique` ON `pages` (`route`);