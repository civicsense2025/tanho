CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`event_type_id` text NOT NULL,
	`person_id` text,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`tz` text DEFAULT 'UTC' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`answers` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`google_event_id` text,
	`reminders_sent` text DEFAULT '{}' NOT NULL,
	`stripe_payment_intent_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_code_unique` ON `bookings` (`code`);--> statement-breakpoint
CREATE TABLE `event_types` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`duration_min` integer DEFAULT 30 NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`color` text DEFAULT 'accent' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`locations` text DEFAULT '[]' NOT NULL,
	`form_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_types_slug_unique` ON `event_types` (`slug`);