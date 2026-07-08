import { asc, eq } from "drizzle-orm";
import { database } from "../client";
import {
  reminderOffsets,
  reminderBatches,
  reminderBatchItems,
} from "../schema";
import type { ReminderOffset, ReminderBatch } from "../schema";

export class ReminderRepository {
  async getReminderOffsets(): Promise<ReminderOffset[]> {
    return database.query.reminderOffsets.findMany({
      orderBy: (t) => [asc(t.days)],
    });
  }

  async addReminderOffset(days: number): Promise<ReminderOffset> {
    const rows = await database
      .insert(reminderOffsets)
      .values({ days, enabled: true })
      .returning();
    return rows[0]!;
  }

  async setReminderOffsetEnabled(
    id: number,
    enabled: boolean,
  ): Promise<void> {
    await database
      .update(reminderOffsets)
      .set({ enabled })
      .where(eq(reminderOffsets.id, id));
  }

  async deleteReminderOffset(id: number): Promise<void> {
    await database.delete(reminderOffsets).where(eq(reminderOffsets.id, id));
  }

  async getAllReminderBatches(): Promise<ReminderBatch[]> {
    return database.query.reminderBatches.findMany({
      orderBy: (t) => [asc(t.scheduledFor)],
    });
  }

  async deleteAllReminderBatches(): Promise<void> {
    await database.delete(reminderBatches);
  }

  async addReminderBatch(
    data: typeof reminderBatches.$inferInsert,
  ): Promise<ReminderBatch> {
    const rows = await database
      .insert(reminderBatches)
      .values(data)
      .returning();
    return rows[0]!;
  }

  async addReminderBatchItems(
    batchId: number,
    inventoryIds: number[],
  ): Promise<void> {
    if (inventoryIds.length === 0) return;
    const items = inventoryIds.map((inventoryId) => ({
      batchId,
      inventoryId,
    }));
    await database.insert(reminderBatchItems).values(items);
  }
}

export const reminderRepository = new ReminderRepository();
