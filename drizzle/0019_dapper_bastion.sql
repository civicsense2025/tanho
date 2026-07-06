CREATE TABLE `font_faces` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`media_id` text NOT NULL,
	`weight` integer DEFAULT 400 NOT NULL,
	`style` text DEFAULT 'normal' NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`unicode_range` text DEFAULT '' NOT NULL,
	`is_variable` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `font_families` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source` text DEFAULT 'custom' NOT NULL,
	`css_stack` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL
);
