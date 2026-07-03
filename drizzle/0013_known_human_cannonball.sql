CREATE TABLE `data_source_oauth_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`account_label` text DEFAULT '' NOT NULL,
	`credentials_encrypted` text NOT NULL,
	`scopes` text DEFAULT '' NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `data_source_connections` ADD `oauth_connection_id` text;