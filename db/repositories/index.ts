export { ProductRepository, productRepository } from "./ProductRepository";
export { InventoryRepository, inventoryRepository } from "./InventoryRepository";
export {
  NotificationSettingsRepository,
  notificationSettingsRepository,
} from "./NotificationSettingsRepository";
export { ReminderRepository, reminderRepository } from "./ReminderRepository";
export { AISettingsRepository, aiSettingsRepository } from "./AISettingsRepository";
export { ScanSessionRepository, scanSessionRepository } from "./ScanSessionRepository";

// Re-export for backwards compatibility
export { productRepository as default } from "./ProductRepository";
