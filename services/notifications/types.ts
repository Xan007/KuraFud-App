export const NOTIFICATION_CHANNEL_ID = "expiration-reminders";
export const NOTIFICATION_DATA_TYPE = "expiration-reminder";

export const QUICK_ADD_OFFSETS = [0, 1, 3, 7, 14, 30] as const;

export function formatOffsetLabel(
  days: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (days === 0) return t("settings.sameDay");
  if (days === 1) return t("settings.dayBefore");
  return t("settings.daysBefore", { days });
}


export function offsetIcon(days: number) {
  switch (days) {
    case 0:
      return { ios: "calendar.badge.clock", android: "schedule" } as const;
    case 1:
      return { ios: "sun.max", android: "wb_sunny" } as const;
    case 3:
      return { ios: "sun.haze", android: "wb_cloudy" } as const;
    case 7:
      return { ios: "calendar", android: "calendar_month" } as const;
    case 14:
      return { ios: "calendar.badge.plus", android: "calendar_add_on" } as const;
    case 30:
      return { ios: "tray.full", android: "inventory_2" } as const;
    default:
      return { ios: "calendar", android: "calendar_month" } as const;
  }
}
