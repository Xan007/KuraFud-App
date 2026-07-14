import { and, eq, gte, lte, isNull } from "drizzle-orm";
import { database } from "../client";
import { inventory } from "../schema";
import type { InventoryItem } from "../schema";
import { parseDateString } from "@/helpers/format";

export class InventoryRepository {
  async addInventoryItem(
    data: typeof inventory.$inferInsert,
  ): Promise<InventoryItem> {
    const rows = await database.insert(inventory).values(data).returning();
    return rows[0]!;
  }

  async updateInventoryItem(
    id: number,
    data: Partial<typeof inventory.$inferInsert>,
  ) {
    return database.update(inventory).set(data).where(eq(inventory.id, id));
  }

  async deleteInventoryItem(id: number) {
    return database.delete(inventory).where(eq(inventory.id, id));
  }

  async getExpiringItems(days: number) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);


    const allActive = await database.query.inventory.findMany({
      where: isNull(inventory.consumedAt),
      with: { product: true },
    });

    return allActive.filter((item) => {
      const expDate = parseDateString(item.expirationDate);
      return expDate >= now && expDate <= future;
    });
  }

  async getAllInventoryItems() {
    return database.query.inventory.findMany({
      where: isNull(inventory.consumedAt),
      with: { product: true },
    });
  }

  async markAsConsumed(id: number): Promise<void> {
    await database
      .update(inventory)
      .set({ consumedAt: new Date() })
      .where(eq(inventory.id, id));
  }

  async undoConsumed(id: number): Promise<void> {
    await database
      .update(inventory)
      .set({ consumedAt: null })
      .where(eq(inventory.id, id));
  }

  async deleteExpiredInventory(graceDays: number): Promise<number> {
    const allActive = await database.query.inventory.findMany({
      where: isNull(inventory.consumedAt),
    });

    const now = new Date();
    const graceDeadline = new Date();
    graceDeadline.setDate(graceDeadline.getDate() - graceDays);

    const toDelete = allActive.filter((item) => {
      const expDate = parseDateString(item.expirationDate);
      return expDate < graceDeadline;
    });

    if (toDelete.length === 0) return 0;

    const ids = toDelete.map((item) => item.id);
    for (const id of ids) {
      await this.deleteInventoryItem(id);
    }

    return ids.length;
  }
}

export const inventoryRepository = new InventoryRepository();
