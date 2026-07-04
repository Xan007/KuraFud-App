import * as Notifications from "expo-notifications";

export async function getNotificationPermissionStatus(): Promise<
  Notifications.IosAuthorizationStatus | Notifications.AndroidAuthorizationStatus
> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === "granted";
}
