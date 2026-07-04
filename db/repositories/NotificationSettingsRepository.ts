import { eq } from "drizzle-orm";
import { database } from "../client";
import { notificationSettings } from "../schema";
import type { NotificationSettings } from "../schema";

export class NotificationSettingsRepository {
  async getNotificationSettings(): Promise<NotificationSettings> {
    const result = await database.query.notificationSettings.findFirst({
      where: eq(notificationSettings.id, 1),
    });
    return (
      result || {
        id: 1,
        enabled: false,
        reminderHour: 6,
        reminderMinute: 0,
      }
    );
  }

  async saveNotificationSettings(
    data: Partial<Omit<NotificationSettings, "id">>,
  ): Promise<void> {
    await database
      .update(notificationSettings)
      .set(data)
      .where(eq(notificationSettings.id, 1));
  }
}

export const notificationSettingsRepository =
  new NotificationSettingsRepository();
