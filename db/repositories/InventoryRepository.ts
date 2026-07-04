import { and, eq, gte, lte, isNull } from "drizzle-orm";
import { database } from "../client";
import { inventory } from "../schema";
import type { InventoryItem } from "../schema";

// Helper to parse DD/MM/YYYY to Date (UTC)
function parseDateString(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

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

    // Get all active (not consumed) items, then filter by date in JS
    // (SQL string comparison of DD/MM/YYYY doesn't work correctly across month/year boundaries)
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
    // Only return active (not consumed) items for notifications
    return database.query.inventory.findMany({
      where: isNull(inventory.consumedAt),
      with: { product: true },
    });
  }

  // Mark an item as consumed (user ate/threw it away)
  async markAsConsumed(id: number): Promise<void> {
    await database
      .update(inventory)
      .set({ consumedAt: new Date() })
      .where(eq(inventory.id, id));
  }

  // Undo consume action
  async undoConsumed(id: number): Promise<void> {
    await database
      .update(inventory)
      .set({ consumedAt: null })
      .where(eq(inventory.id, id));
  }

  // Auto-delete inventory items that are expired (past date) and beyond grace period
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
