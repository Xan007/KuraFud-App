import { Platform, ToastAndroid, Alert } from "react-native";

export function showToast(msg: string): void {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("", msg);
  }
}
