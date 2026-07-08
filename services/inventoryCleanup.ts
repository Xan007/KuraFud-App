import { inventoryRepository } from "@/db/repositories";

export const EXPIRED_GRACE_PERIOD_DAYS = 3;

export async function cleanupExpiredInventory(): Promise<number> {
  try {
    const deleted = await inventoryRepository.deleteExpiredInventory(EXPIRED_GRACE_PERIOD_DAYS);
    if (deleted > 0) {
      console.log(`[Cleanup] Deleted ${deleted} expired inventory items`);
    }
    return deleted;
  } catch (e) {
    console.error("[Cleanup] Error deleting expired items:", e);
    return 0;
  }
}
