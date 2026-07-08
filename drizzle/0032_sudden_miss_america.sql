CREATE TABLE `review_aggregates` (
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`average` real DEFAULT 0 NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`distribution` text DEFAULT '[0,0,0,0,0]' NOT NULL,
	`computed_at` integer NOT NULL,
	PRIMARY KEY(`target_type`, `target_id`)
);
--> statement-breakpoint
CREATE TABLE `review_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`body` text NOT NULL,
	`by_user_id` text NOT NULL,
	`at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_targets` (
	`target_type` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`moderation` text DEFAULT 'post' NOT NULL,
	`verified_gate` text DEFAULT 'optional' NOT NULL,
	`require_login` integer DEFAULT true NOT NULL,
	`allow_rating` integer DEFAULT true NOT NULL,
	`min_rating` integer DEFAULT 1 NOT NULL,
	`max_rating` integer DEFAULT 5 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_votes` (
	`review_id` text NOT NULL,
	`person_id` text NOT NULL,
	`at` integer NOT NULL,
	PRIMARY KEY(`review_id`, `person_id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`person_id` text NOT NULL,
	`rating` integer DEFAULT 0 NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`photos` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`moderation_note` text DEFAULT '' NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`verified_method` text DEFAULT 'none' NOT NULL,
	`verified_ref` text,
	`helpful_votes` integer DEFAULT 0 NOT NULL,
	`meta` text DEFAULT '{}' NOT NULL,
	`source` text DEFAULT 'web' NOT NULL,
	`at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reviews_target_idx` ON `reviews` (`target_type`,`target_id`,`status`);--> statement-breakpoint
CREATE INDEX `reviews_person_idx` ON `reviews` (`person_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_person_target_idx` ON `reviews` (`person_id`,`target_type`,`target_id`);