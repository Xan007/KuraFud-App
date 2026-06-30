import { eq, and, lte, gte } from "drizzle-orm";
import { database } from "./index";
import { products, inventory } from "./schema";

export function getProduct(barcode: string) {
  return database.query.products.findFirst({
    where: eq(products.barcode, barcode),
    with: {
      inventory: {
        orderBy: (items, { asc }) => [asc(items.expirationDate)],
      },
    },
  });
}

export function getAllProducts() {
  return database.query.products.findMany({
    with: {
      inventory: {
        orderBy: (items, { asc }) => [asc(items.expirationDate)],
      },
    },
    orderBy: (products, { desc }) => [desc(products.createdAt)],
  });
}

export function upsertProduct(data: typeof products.$inferInsert) {
  return database
    .insert(products)
    .values(data)
    .onConflictDoUpdate({ target: products.barcode, set: data });
}

export function updateProductName(barcode: string, name: string) {
  return database
    .update(products)
    .set({ name })
    .where(eq(products.barcode, barcode));
}

export function deleteProduct(barcode: string) {
  return database.delete(products).where(eq(products.barcode, barcode));
}

export function addInventoryItem(data: typeof inventory.$inferInsert) {
  return database.insert(inventory).values(data);
}

export function updateInventoryItem(
  id: number,
  data: Partial<typeof inventory.$inferInsert>,
) {
  return database.update(inventory).set(data).where(eq(inventory.id, id));
}

export function deleteInventoryItem(id: number) {
  return database.delete(inventory).where(eq(inventory.id, id));
}

export function getExpiringItems(days: number) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  const fmt = (d: Date) => {
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return database.query.inventory.findMany({
    where: and(
      gte(inventory.expirationDate, fmt(now)),
      lte(inventory.expirationDate, fmt(future)),
    ),
    with: { product: true },
    orderBy: (items, { asc }) => [asc(items.expirationDate)],
  });
}
