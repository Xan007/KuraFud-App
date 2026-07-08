import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";
import * as relations from "./relations";

export const sqliteDb = SQLite.openDatabaseSync("expirat.db");

const tables = [
  `CREATE TABLE IF NOT EXISTS products (
    barcode text PRIMARY KEY NOT NULL,
    name text DEFAULT '' NOT NULL,
    brand text DEFAULT '' NOT NULL,
    quantity text DEFAULT '' NOT NULL,
    ingredients text DEFAULT '' NOT NULL,
    image_front_url text DEFAULT '' NOT NULL,
    categories text DEFAULT '' NOT NULL,
    nutriscore text DEFAULT '' NOT NULL,
    data_json text,
    created_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    barcode text NOT NULL REFERENCES products(barcode) ON DELETE CASCADE,
    expiration_date text NOT NULL,
    date_photo_uri text,
    notes text DEFAULT '' NOT NULL,
    consumed_at integer,
    created_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notification_settings (
    id integer PRIMARY KEY NOT NULL,
    enabled integer DEFAULT 0 NOT NULL,
    reminder_hour integer DEFAULT 6 NOT NULL,
    reminder_minute integer DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reminder_offsets (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    days integer UNIQUE NOT NULL,
    enabled integer DEFAULT 1 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reminder_batches (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    offset_days integer NOT NULL,
    notification_id text NOT NULL,
    scheduled_for integer NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reminder_batch_items (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    batch_id integer NOT NULL REFERENCES reminder_batches(id) ON DELETE CASCADE,
    inventory_id integer NOT NULL REFERENCES inventory(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS ai_settings (
    id integer PRIMARY KEY NOT NULL,
    provider text DEFAULT '' NOT NULL,
    model text DEFAULT '' NOT NULL,
    max_tokens integer,
    custom_instructions text DEFAULT '' NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS scan_session (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    barcode text NOT NULL,
    product_json text,
    date text,
    date_photo_uri text,
    created_at integer NOT NULL
  )`,
];

for (const sql of tables) {
  sqliteDb.execSync(sql);
}

sqliteDb.execSync(`INSERT OR IGNORE INTO notification_settings (id, enabled, reminder_hour, reminder_minute) VALUES (1, 0, 6, 0)`);
sqliteDb.execSync(`INSERT OR IGNORE INTO reminder_offsets (id, days, enabled) VALUES (1, 0, 1), (2, 3, 1)`);
sqliteDb.execSync(`INSERT OR IGNORE INTO ai_settings (id, provider, model, max_tokens, custom_instructions, updated_at) VALUES (1, '', '', NULL, '', 0)`);

export const database = drizzle(sqliteDb, {
  schema: { ...schema, ...relations },
});

export type Database = typeof database;
