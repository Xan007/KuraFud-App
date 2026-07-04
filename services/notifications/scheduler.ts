import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { parseDateString, formatDateString } from "@/helpers/format";
import {
  notificationSettingsRepository,
  reminderRepository,
  inventoryRepository,
} from "@/db/repositories";
import { NOTIFICATION_CHANNEL_ID, NOTIFICATION_DATA_TYPE } from "./types";

export async function computeTriggerDate(
  expirationDate: string,
  offsetDays: number,
  hour: number,
  minute: number,
  now: Date = new Date(),
): Promise<Date | null> {
  const expDate = parseDateString(expirationDate);
  const triggerDate = new Date(expDate);
  triggerDate.setUTCDate(triggerDate.getUTCDate() - offsetDays);

  // Convert local time to UTC by creating a date with the local time, then extracting UTC components
  const localDate = new Date();
  localDate.setHours(hour, minute, 0, 0);
  triggerDate.setUTCHours(localDate.getUTCHours(), localDate.getUTCMinutes(), 0, 0);

  return triggerDate > now ? triggerDate : null;
}

export function buildNotificationBody(
  offsetDays: number,
  productNames: string[],
): { title: string; body: string } {
  const count = productNames.length;
  let daysText = "";

  if (offsetDays === 0) {
    daysText = "hoy";
  } else if (offsetDays === 1) {
    daysText = "mañana";
  } else {
    daysText = `en ${offsetDays} días`;
  }

  let productText = "";
  if (count === 1) {
    productText = productNames[0];
  } else if (count === 2) {
    productText = productNames.join(" y ");
  } else if (count === 3) {
    productText = productNames.slice(0, -1).join(", ") + " y " + productNames[2];
  } else {
    productText = `${count} productos`;
  }

  return {
    title: "Producto por caducar",
    body: `${productText} vencen ${daysText}`,
  };
}

async function scheduleOneOffset(
  offsetDays: number,
  triggerDate: Date,
  productNames: string[],
  inventoryIds: number[],
): Promise<void> {
  const { title, body } = buildNotificationBody(offsetDays, productNames);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: NOTIFICATION_DATA_TYPE,
        offsetDays,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      ...(Platform.OS === "android" && { channelId: NOTIFICATION_CHANNEL_ID }),
    },
  });

  const batch = await reminderRepository.addReminderBatch({
    offsetDays,
    notificationId,
    scheduledFor: triggerDate,
    createdAt: new Date(),
  });

  await reminderRepository.addReminderBatchItems(batch.id, inventoryIds);
}

export async function rebuildAllReminders(): Promise<void> {
  try {
    const existingBatches = await reminderRepository.getAllReminderBatches();
    for (const batch of existingBatches) {
      try {
        await Notifications.cancelScheduledNotificationAsync(batch.notificationId);
      } catch {
        // Notificación ya despachada o cancelada, ignorar
      }
    }
    await reminderRepository.deleteAllReminderBatches();

    const settings = await notificationSettingsRepository.getNotificationSettings();
    if (!settings.enabled) return;

    const offsets = await reminderRepository.getReminderOffsets();
    const enabledOffsets = offsets
      .filter((o) => o.enabled)
      .map((o) => o.days)
      .sort((a, b) => a - b);

    if (enabledOffsets.length === 0) return;

    const items = await inventoryRepository.getAllInventoryItems();
    if (items.length === 0) return;

    for (const offsetDays of enabledOffsets) {
      const grouped = new Map<string, { inventoryIds: number[]; productNames: string[]; triggerDate: Date }>();

      for (const item of items) {
        const triggerDate = await computeTriggerDate(
          item.expirationDate,
          offsetDays,
          settings.reminderHour,
          settings.reminderMinute,
        );

        if (!triggerDate) continue;

        const key = formatDateString(triggerDate);
        if (!grouped.has(key)) {
          grouped.set(key, { inventoryIds: [], productNames: [], triggerDate });
        }

        const group = grouped.get(key)!;
        group.inventoryIds.push(item.id);
        group.productNames.push(item.product.name || "Producto");
      }

      for (const [, group] of grouped) {
        await scheduleOneOffset(
          offsetDays,
          group.triggerDate,
          group.productNames,
          group.inventoryIds,
        );
      }
    }
  } catch (e) {
    console.error("[Notifications] Error rebuilding reminders:", e);
  }
}
