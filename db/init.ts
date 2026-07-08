import { sqliteDb } from "./client";

export function initializeDatabase(): void {
  try {
    sqliteDb.execSync(`ALTER TABLE inventory ADD COLUMN consumed_at integer;`);
  } catch {
    // Column already exists
  }

  try {
    sqliteDb.execSync(`ALTER TABLE products ADD COLUMN data_json text;`);
  } catch {
    // Column already exists
  }
}