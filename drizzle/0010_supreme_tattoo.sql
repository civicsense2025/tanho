CREATE TABLE `integration_connections` (
	`provider` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'connected' NOT NULL,
	`credentials` text NOT NULL,
	`account_label` text DEFAULT '' NOT NULL,
	`scopes` text DEFAULT '' NOT NULL,
	`expires_at` integer,
	`connected_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
