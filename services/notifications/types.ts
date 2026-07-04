export const NOTIFICATION_CHANNEL_ID = "expiration-reminders";
export const NOTIFICATION_DATA_TYPE = "expiration-reminder";

export const QUICK_ADD_OFFSETS = [0, 1, 3, 7, 14, 30] as const;

export function formatOffsetLabel(days: number): string {
  if (days === 0) return "El mismo día";
  if (days === 1) return "1 día antes";
  return `${days} días antes`;
}
