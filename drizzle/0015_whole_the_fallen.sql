CREATE TABLE `block_registry` (
	`type` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`label` text NOT NULL,
	`icon` text NOT NULL,
	`blurb` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'builtin' NOT NULL,
	`builtin` integer DEFAULT true NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_slot_idx` ON `bookings` (`event_type_id`,`date`,`time`) WHERE "bookings"."status" != 'cancelled';