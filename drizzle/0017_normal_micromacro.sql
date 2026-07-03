ALTER TABLE `orders` ADD `refunded_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `source` text DEFAULT 'shop' NOT NULL;