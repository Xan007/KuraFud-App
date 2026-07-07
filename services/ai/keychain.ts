import * as Keychain from "react-native-keychain";
import { Platform } from "react-native";

const SERVICE_PREFIX = "expirat.ai";

function getServiceName(providerId: string): string {
  return `${SERVICE_PREFIX}.${providerId}`;
}

export async function getAPIKey(providerId: string): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: getServiceName(providerId),
    });
    return credentials ? credentials.password : null;
  } catch (error) {
    console.error(`Failed to retrieve API key for ${providerId}:`, error);
    return null;
  }
}

export async function setAPIKey(
  providerId: string,
  apiKey: string,
): Promise<boolean> {
  try {
    await Keychain.setGenericPassword("apikey", apiKey, {
      service: getServiceName(providerId),
      accessible: Platform.select({
        ios: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        android: undefined,
      }),
    });
    return true;
  } catch (error) {
    console.error(`Failed to save API key for ${providerId}:`, error);
    return false;
  }
}

export async function deleteAPIKey(providerId: string): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({
      service: getServiceName(providerId),
    });
    return true;
  } catch (error) {
    console.error(`Failed to delete API key for ${providerId}:`, error);
    return false;
  }
}

