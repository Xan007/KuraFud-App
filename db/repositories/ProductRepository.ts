import { eq, isNull } from "drizzle-orm";
import { database } from "../client";
import { products, inventory } from "../schema";
import type { Product, ProductWithInventory } from "../schema";

export class ProductRepository {
  async getProduct(barcode: string) {
    return database.query.products.findFirst({
      where: eq(products.barcode, barcode),
      with: {
        inventory: {
          orderBy: (items, { asc }) => [asc(items.expirationDate)],
        },
      },
    });
  }

  async getAllProducts(): Promise<ProductWithInventory[]> {
    return database.query.products.findMany({
      with: {
        inventory: {
          where: isNull(inventory.consumedAt),
          orderBy: (items, { asc }) => [asc(items.expirationDate)],
        },
      },
      orderBy: (products, { desc }) => [desc(products.createdAt)],
    }) as Promise<ProductWithInventory[]>;
  }

  async upsertProduct(data: typeof products.$inferInsert) {
    return database
      .insert(products)
      .values(data)
      .onConflictDoUpdate({ target: products.barcode, set: data });
  }

  async updateProductName(barcode: string, name: string) {
    return database
      .update(products)
      .set({ name })
      .where(eq(products.barcode, barcode));
  }

  async deleteProduct(barcode: string) {
    return database.delete(products).where(eq(products.barcode, barcode));
  }
}

export const productRepository = new ProductRepository();
