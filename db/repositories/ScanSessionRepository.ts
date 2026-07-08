import { eq } from "drizzle-orm";
import { database } from "../client";
import { scanSession } from "../schema";
import type { ScanSessionItem } from "../schema";

export class ScanSessionRepository {
  async loadSession(): Promise<ScanSessionItem[]> {
    return database.query.scanSession.findMany({
      orderBy: (items, { asc }) => [asc(items.createdAt)],
    });
  }

  async insertItem(
    data: Omit<typeof scanSession.$inferInsert, "id">,
  ): Promise<number> {
    const rows = await database.insert(scanSession).values(data).returning();
    return rows[0]!.id;
  }

  async updateItem(
    id: number,
    data: Partial<Omit<typeof scanSession.$inferInsert, "id">>,
  ): Promise<void> {
    await database.update(scanSession).set(data).where(eq(scanSession.id, id));
  }

  async deleteItem(id: number): Promise<void> {
    await database.delete(scanSession).where(eq(scanSession.id, id));
  }

  async clearSession(): Promise<void> {
    await database.delete(scanSession);
  }
}

export const scanSessionRepository = new ScanSessionRepository();
