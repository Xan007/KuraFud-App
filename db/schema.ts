import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  barcode: text("barcode").primaryKey(),
  name: text("name").notNull().default(""),
  brand: text("brand").notNull().default(""),
  quantity: text("quantity").notNull().default(""),
  ingredients: text("ingredients").notNull().default(""),
  imageFrontUrl: text("image_front_url").notNull().default(""),
  categories: text("categories").notNull().default(""),
  nutriscore: text("nutriscore").notNull().default(""),
  dataJson: text("data_json"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barcode: text("barcode")
    .notNull()
    .references(() => products.barcode, { onDelete: "cascade" }),
  expirationDate: text("expiration_date").notNull(),
  datePhotoUri: text("date_photo_uri"),
  notes: text("notes").notNull().default(""),
  consumedAt: integer("consumed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const notificationSettings = sqliteTable("notification_settings", {
  id: integer("id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  reminderHour: integer("reminder_hour").notNull().default(6),
  reminderMinute: integer("reminder_minute").notNull().default(0),
});

export const reminderOffsets = sqliteTable("reminder_offsets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  days: integer("days").notNull().unique(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const reminderBatches = sqliteTable("reminder_batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  offsetDays: integer("offset_days").notNull(),
  notificationId: text("notification_id").notNull(),
  scheduledFor: integer("scheduled_for", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const reminderBatchItems = sqliteTable("reminder_batch_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  batchId: integer("batch_id")
    .notNull()
    .references(() => reminderBatches.id, { onDelete: "cascade" }),
  inventoryId: integer("inventory_id")
    .notNull()
    .references(() => inventory.id, { onDelete: "cascade" }),
});

export const aiSettings = sqliteTable("ai_settings", {
  id: integer("id").primaryKey(),
  provider: text("provider").notNull().default(""),
  model: text("model").notNull().default(""),
  maxTokens: integer("max_tokens"),
  customInstructions: text("custom_instructions").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const scanSession = sqliteTable("scan_session", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barcode: text("barcode").notNull(),
  productJson: text("product_json"),
  date: text("date"),
  datePhotoUri: text("date_photo_uri"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Type exports for use across the app
export type Product = typeof products.$inferSelect;
export type InventoryItem = typeof inventory.$inferSelect;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type ReminderOffset = typeof reminderOffsets.$inferSelect;
export type ReminderBatch = typeof reminderBatches.$inferSelect;
export type ReminderBatchItem = typeof reminderBatchItems.$inferSelect;
export type AISettings = typeof aiSettings.$inferSelect;
export type ScanSessionItem = typeof scanSession.$inferSelect;

// Inferred type for products with nested inventory items
export type ProductWithInventory = Product & {
  inventory: InventoryItem[];
};
