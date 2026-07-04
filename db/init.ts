import { sqliteDb } from "./client";

/**
 * Initializes the SQLite database schema.
 *
 * This function creates all necessary tables and seeds default data.
 * It's called once during app startup and uses CREATE TABLE IF NOT EXISTS
 * to safely handle already-initialized databases.
 */
export function initializeDatabase(): void {
  sqliteDb.execSync(`
    -- Products: base product information from OpenFoodFacts
    CREATE TABLE IF NOT EXISTS products (
      barcode text PRIMARY KEY NOT NULL,
      name text DEFAULT '' NOT NULL,
      brand text DEFAULT '' NOT NULL,
      quantity text DEFAULT '' NOT NULL,
      ingredients text DEFAULT '' NOT NULL,
      image_front_url text DEFAULT '' NOT NULL,
      categories text DEFAULT '' NOT NULL,
      nutriscore text DEFAULT '' NOT NULL,
      created_at integer NOT NULL
    );

    -- Inventory: per-instance tracking of product expiration dates
    CREATE TABLE IF NOT EXISTS inventory (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      barcode text NOT NULL REFERENCES products(barcode) ON DELETE CASCADE,
      expiration_date text NOT NULL,
      date_photo_uri text,
      notes text DEFAULT '' NOT NULL,
      consumed_at integer,
      created_at integer NOT NULL
    );

    -- Notification settings: global configuration (single row, id=1)
    CREATE TABLE IF NOT EXISTS notification_settings (
      id integer PRIMARY KEY NOT NULL,
      enabled integer DEFAULT 0 NOT NULL,
      reminder_hour integer DEFAULT 6 NOT NULL,
      reminder_minute integer DEFAULT 0 NOT NULL
    );
    INSERT OR IGNORE INTO notification_settings (id, enabled, reminder_hour, reminder_minute)
    VALUES (1, 0, 6, 0);

    -- Reminder offsets: dynamic list of "days before expiry" to notify
    CREATE TABLE IF NOT EXISTS reminder_offsets (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      days integer UNIQUE NOT NULL,
      enabled integer DEFAULT 1 NOT NULL
    );
    INSERT OR IGNORE INTO reminder_offsets (id, days, enabled)
    VALUES (1, 0, 1), (2, 3, 1);

    -- Reminder batches: groups of notifications scheduled for the same date/offset
    CREATE TABLE IF NOT EXISTS reminder_batches (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      offset_days integer NOT NULL,
      notification_id text NOT NULL,
      scheduled_for integer NOT NULL,
      created_at integer NOT NULL
    );

    -- Reminder batch items: which inventory items are in each notification batch
    CREATE TABLE IF NOT EXISTS reminder_batch_items (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      batch_id integer NOT NULL REFERENCES reminder_batches(id) ON DELETE CASCADE,
      inventory_id integer NOT NULL REFERENCES inventory(id) ON DELETE CASCADE
    );
  `);

  // Migration: add consumed_at column to existing inventory tables (idempotent with try/catch)
  try {
    sqliteDb.execSync(`ALTER TABLE inventory ADD COLUMN consumed_at integer;`);
  } catch {
    // Column already exists, ignore
  }
}
