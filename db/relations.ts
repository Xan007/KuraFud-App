import { relations } from "drizzle-orm";
import { products, inventory, reminderBatches, reminderBatchItems } from "./schema";

export const productsRelations = relations(products, ({ many }) => ({
  inventory: many(inventory),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  product: one(products, {
    fields: [inventory.barcode],
    references: [products.barcode],
  }),
  reminderBatchItems: many(reminderBatchItems),
}));

export const reminderBatchesRelations = relations(reminderBatches, ({ many }) => ({
  reminderBatchItems: many(reminderBatchItems),
}));

export const reminderBatchItemsRelations = relations(reminderBatchItems, ({ one }) => ({
  reminderBatch: one(reminderBatches, {
    fields: [reminderBatchItems.batchId],
    references: [reminderBatches.id],
  }),
  inventory: one(inventory, {
    fields: [reminderBatchItems.inventoryId],
    references: [inventory.id],
  }),
}));
