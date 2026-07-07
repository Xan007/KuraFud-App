import { eq } from "drizzle-orm";
import { database } from "../client";
import { aiSettings } from "../schema";
import type { AISettings } from "../schema";

export class AISettingsRepository {
  async getAISettings(): Promise<AISettings> {
    const result = await database.query.aiSettings.findFirst({
      where: eq(aiSettings.id, 1),
    });
    return (
      result || {
        id: 1,
        provider: "",
        model: "",
        maxTokens: null,
        customInstructions: "",
        updatedAt: new Date(),
      }
    );
  }

  async saveAISettings(
    data: Partial<Omit<AISettings, "id" | "updatedAt">>,
  ): Promise<void> {
    await database
      .update(aiSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(aiSettings.id, 1));
  }
}

export const aiSettingsRepository = new AISettingsRepository();
