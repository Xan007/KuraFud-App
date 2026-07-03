import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";
import * as relations from "./relations";

export const sqliteDb = SQLite.openDatabaseSync("expirat.db");

export const database = drizzle(sqliteDb, {
  schema: { ...schema, ...relations },
});

export type Database = typeof database;
