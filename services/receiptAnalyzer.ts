import * as FileSystem from "expo-file-system/legacy";
import { aiSettingsRepository } from "@/db/repositories";
import { getAPIKey } from "@/services/ai/keychain";
import { createAIClient } from "@/services/ai/createAIClient";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { ReceiptItem } from "@/services/ai/types";

export async function analyzeReceiptImage(imagePath: string): Promise<ReceiptItem[]> {
  const aiSettings = await aiSettingsRepository.getAISettings();

  if (!aiSettings.provider || !aiSettings.model) {
    throw new Error("Proveedor de IA no configurado");
  }

  const apiKey = await getAPIKey(aiSettings.provider);
  if (!apiKey) {
    throw new Error("API key no encontrada");
  }

  const resized = await manipulateAsync(imagePath, [{ resize: { width: 1500 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
  });

  const base64 = await FileSystem.readAsStringAsync(resized.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const client = createAIClient({
    providerId: aiSettings.provider,
    model: aiSettings.model,
    apiKey,
    maxTokens: aiSettings.maxTokens ?? undefined,
  });

  const items = await client.analyzeReceipt(
    { base64, mimeType: "image/jpeg" },
    { customInstructions: aiSettings.customInstructions },
  );

  return items;
}
