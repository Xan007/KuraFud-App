import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NOTIFICATION_CHANNEL_ID, NOTIFICATION_DATA_TYPE } from "./types";

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: "Recordatorios de caducidad",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 100],
    lightColor: "#34A853",
  });
}

export function addNotificationTapListener(onTap: () => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      if (
        response.notification.request.content.data?.type ===
        NOTIFICATION_DATA_TYPE
      ) {
        onTap();
      }
    },
  );

  return () => subscription.remove();
}
