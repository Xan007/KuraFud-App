CREATE TABLE `ai_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`max_tokens` integer,
	`custom_instructions` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barcode` text NOT NULL,
	`expiration_date` text NOT NULL,
	`date_photo_uri` text,
	`notes` text DEFAULT '' NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`barcode`) REFERENCES `products`(`barcode`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`reminder_hour` integer DEFAULT 6 NOT NULL,
	`reminder_minute` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`barcode` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`quantity` text DEFAULT '' NOT NULL,
	`ingredients` text DEFAULT '' NOT NULL,
	`image_front_url` text DEFAULT '' NOT NULL,
	`categories` text DEFAULT '' NOT NULL,
	`nutriscore` text DEFAULT '' NOT NULL,
	`data_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminder_batch_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batch_id` integer NOT NULL,
	`inventory_id` integer NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `reminder_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminder_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offset_days` integer NOT NULL,
	`notification_id` text NOT NULL,
	`scheduled_for` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminder_offsets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`days` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_offsets_days_unique` ON `reminder_offsets` (`days`);