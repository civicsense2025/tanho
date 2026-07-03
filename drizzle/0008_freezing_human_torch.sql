CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`at` integer NOT NULL,
	`name` text NOT NULL,
	`path` text DEFAULT '' NOT NULL,
	`session_id` text DEFAULT '' NOT NULL,
	`person_id` text,
	`props` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_events_name_at_idx` ON `analytics_events` (`name`,`at`);--> statement-breakpoint
CREATE TABLE `form_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text NOT NULL,
	`person_id` text,
	`at` integer NOT NULL,
	`source` text DEFAULT 'web' NOT NULL,
	`values` text DEFAULT '{}' NOT NULL,
	`outcome` text,
	`score` integer
);
--> statement-breakpoint
CREATE TABLE `forms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Untitled form' NOT NULL,
	`type` text DEFAULT 'form' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`fields` text DEFAULT '[]' NOT NULL,
	`design` text NOT NULL,
	`settings` text NOT NULL,
	`quiz` text,
	`analytics` text DEFAULT '{"views":0,"starts":0,"completions":0}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
