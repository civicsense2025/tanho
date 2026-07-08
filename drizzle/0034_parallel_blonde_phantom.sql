CREATE TABLE `entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`grant_type` text NOT NULL,
	`grant_ref` text NOT NULL,
	`granted_at` integer NOT NULL,
	`expires_at` integer,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE INDEX `entitlements_person_idx` ON `entitlements` (`person_id`);--> statement-breakpoint
CREATE INDEX `entitlements_grant_idx` ON `entitlements` (`grant_type`,`grant_ref`);--> statement-breakpoint
CREATE UNIQUE INDEX `entitlements_person_order_grant_idx` ON `entitlements` (`person_id`,`order_id`,`grant_type`,`grant_ref`);--> statement-breakpoint
ALTER TABLE `order_items` ADD `tax_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `tax_code` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `tax_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `tax_refunded_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `tax_breakdown` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `kind` text;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `tax_code` text;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `requires_shipping` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `kind` text DEFAULT 'physical' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `billing_model` text DEFAULT 'one-time' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `membership_tier` text;--> statement-breakpoint
ALTER TABLE `products` ADD `tax_code` text;--> statement-breakpoint
ALTER TABLE `products` ADD `tax_behavior` text DEFAULT 'exclusive' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `fulfillment_mode` text DEFAULT 'ship' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `access_grant_target_type` text;--> statement-breakpoint
ALTER TABLE `products` ADD `access_grant_target_id` text;--> statement-breakpoint
ALTER TABLE `products` ADD `fulfillment_provider` text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `fulfillment_config` text;