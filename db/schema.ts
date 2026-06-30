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
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
