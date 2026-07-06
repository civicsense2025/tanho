ALTER TABLE `custom_types` ADD `table_name` text;--> statement-breakpoint
ALTER TABLE `custom_types` ADD `base_path` text;--> statement-breakpoint
ALTER TABLE `custom_types` ADD `plural_name` text;--> statement-breakpoint
ALTER TABLE `custom_types` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_types` ADD `title_field` text;--> statement-breakpoint
ALTER TABLE `custom_types` ADD `slug_field` text;