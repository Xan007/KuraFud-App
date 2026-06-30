import { relations } from "drizzle-orm";
import { products, inventory } from "./schema";

export const productsRelations = relations(products, ({ many }) => ({
  inventory: many(inventory),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.barcode],
    references: [products.barcode],
  }),
}));
