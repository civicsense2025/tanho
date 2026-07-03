CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`cover_media_id` text,
	`visible` integer DEFAULT true NOT NULL,
	`seo` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_slug_unique` ON `collections` (`slug`);--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`stripe_dispute_id` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'needs_response' NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`evidence_due_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `disputes_stripe_dispute_id_unique` ON `disputes` (`stripe_dispute_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text,
	`variant_id` text,
	`name` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	`unit_cents` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`person_id` text,
	`email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`stripe_payment_intent_id` text,
	`stripe_checkout_session_id` text,
	`shipping_address` text,
	`tracking` text DEFAULT '' NOT NULL,
	`placed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_code_unique` ON `orders` (`code`);--> statement-breakpoint
CREATE TABLE `product_collections` (
	`product_id` text NOT NULL,
	`collection_id` text NOT NULL,
	PRIMARY KEY(`product_id`, `collection_id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`label` text NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`inventory` integer DEFAULT 0 NOT NULL,
	`sku` text DEFAULT '' NOT NULL,
	`weight` text DEFAULT '' NOT NULL,
	`dims` text DEFAULT '' NOT NULL,
	`image_media_id` text,
	`stripe_price_id` text
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`compare_at_cents` integer,
	`currency` text DEFAULT 'usd' NOT NULL,
	`sku` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`track_inventory` integer DEFAULT true NOT NULL,
	`inventory` integer DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer DEFAULT 10 NOT NULL,
	`allow_backorder` integer DEFAULT false NOT NULL,
	`weight` text DEFAULT '' NOT NULL,
	`weight_unit` text DEFAULT 'lb' NOT NULL,
	`dims` text,
	`shipping_class` text DEFAULT 'standard' NOT NULL,
	`seo` text,
	`stripe_product_id` text,
	`stripe_price_id` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE TABLE `shipping_zones` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`method` text DEFAULT 'flat' NOT NULL,
	`rate_cents` integer DEFAULT 0 NOT NULL,
	`per_lb_cents` integer DEFAULT 0 NOT NULL,
	`free_over_cents` integer,
	`countries` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`received_at` integer NOT NULL,
	`processed_at` integer,
	`payload` text
);
