import { sqliteDb } from "./client";

export function initializeDatabase() {
  sqliteDb.execSync(
    `CREATE TABLE IF NOT EXISTS products (
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
CREATE TABLE IF NOT EXISTS inventory (
id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
barcode text NOT NULL REFERENCES products(barcode) ON DELETE CASCADE,
expiration_date text NOT NULL,
date_photo_uri text,
notes text DEFAULT '' NOT NULL,
created_at integer NOT NULL
);`,
  );
}
