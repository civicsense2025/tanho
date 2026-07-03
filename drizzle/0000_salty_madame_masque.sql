CREATE TABLE `settings` (
	`namespace` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `theme` (
	`id` text PRIMARY KEY DEFAULT 'theme' NOT NULL,
	`accent` text NOT NULL,
	`accent2` text NOT NULL,
	`ink` text NOT NULL,
	`paper` text NOT NULL,
	`font` text DEFAULT 'geist' NOT NULL,
	`base_size` real DEFAULT 16 NOT NULL,
	`heading_scale` real DEFAULT 1 NOT NULL,
	`leading` real DEFAULT 1.6 NOT NULL,
	`density` real DEFAULT 1 NOT NULL,
	`radius` text DEFAULT 'soft' NOT NULL,
	`shadow` text DEFAULT 'subtle' NOT NULL,
	`logo_media_id` text,
	`favicon_media_id` text,
	`updated_at` integer NOT NULL
);
