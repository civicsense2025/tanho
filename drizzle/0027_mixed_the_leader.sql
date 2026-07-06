CREATE TABLE `seo_audit_404` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`referrer` text DEFAULT '' NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`last_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seo_audit_404_path_unique` ON `seo_audit_404` (`path`);--> statement-breakpoint
CREATE INDEX `seo_audit_404_last_idx` ON `seo_audit_404` (`last_at`);--> statement-breakpoint
CREATE TABLE `seo_web_vitals` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text DEFAULT '' NOT NULL,
	`metric` text NOT NULL,
	`value` real NOT NULL,
	`rating` text DEFAULT '' NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `seo_web_vitals_metric_idx` ON `seo_web_vitals` (`metric`,`at`);