CREATE TABLE `slug_history` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`old_path` text NOT NULL,
	`new_path` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `slug_history_entity_idx` ON `slug_history` (`entity_type`,`entity_id`);