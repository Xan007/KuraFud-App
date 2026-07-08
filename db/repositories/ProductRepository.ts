import { eq, isNull } from "drizzle-orm";
import { database } from "../client";
import { products, inventory } from "../schema";
import type { Product, ProductWithInventory } from "../schema";
import type { ProductInfo } from "types";
import { emptyProduct } from "types";

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

  async getProductInfo(barcode: string): Promise<ProductInfo | null> {
    const row = await database
      .select()
      .from(products)
      .where(eq(products.barcode, barcode))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!row) return null;

    if (row.dataJson) {
      try {
        return JSON.parse(row.dataJson) as ProductInfo;
      } catch {
        // Fall through to basic construction
      }
    }

    return {
      ...emptyProduct,
      barcode: row.barcode,
      name: row.name,
      brand: row.brand,
      quantity: row.quantity,
      ingredients: row.ingredients,
      imageFrontUrl: row.imageFrontUrl,
      categories: row.categories,
      nutriscore: row.nutriscore,
    };
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
