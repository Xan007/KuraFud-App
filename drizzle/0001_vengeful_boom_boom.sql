CREATE TABLE `scan_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barcode` text NOT NULL,
	`product_json` text,
	`date` text,
	`date_photo_uri` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `ai_settings` ADD `custom_api_url` text DEFAULT '' NOT NULL;