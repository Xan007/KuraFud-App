import { inventoryRepository } from "@/db/repositories";

/** Days to keep expired items before auto-deleting them */
export const EXPIRED_GRACE_PERIOD_DAYS = 3;

/**
 * Auto-deletes inventory items that have been expired for more than the grace period.
 * Called once at app startup to keep the database clean.
 *
 * @returns The number of items deleted
 */
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
