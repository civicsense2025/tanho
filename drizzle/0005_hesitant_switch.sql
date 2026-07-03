CREATE TABLE `email_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`list` text DEFAULT 'default' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`double_opt_in_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`tier` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`stripe_subscription_id` text,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`since` integer NOT NULL,
	`current_period_end` integer,
	`cancel_at` integer
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'subscriber' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`password_hash` text,
	`email_verified_at` integer,
	`phone` text DEFAULT '' NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`stripe_customer_id` text,
	`socials` text DEFAULT '[]' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`last_active_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_email_unique` ON `people` (`email`);--> statement-breakpoint
CREATE TABLE `person_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`meta` text,
	`at` integer NOT NULL
);
