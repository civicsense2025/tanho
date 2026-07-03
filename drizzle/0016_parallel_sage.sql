CREATE TABLE `pack_entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`pack_type` text NOT NULL,
	`pack_entry_id` text NOT NULL,
	`order_id` text NOT NULL,
	`granted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pack_entitlements_person_pack_order_idx` ON `pack_entitlements` (`person_id`,`pack_type`,`pack_entry_id`,`order_id`);--> statement-breakpoint
ALTER TABLE `products` ADD `pack_type` text;--> statement-breakpoint
ALTER TABLE `products` ADD `pack_entry_id` text;