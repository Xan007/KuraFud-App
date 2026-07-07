import type { AIProvider, ReceiptItem, AITestResult } from "../types";
import { AIError } from "../types";
import { buildSystemPrompt, parseReceiptResponse } from "../receiptPrompt";

interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens?: number;
}

export class OpenAICompatibleProvider implements AIProvider {
  private config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
  }

  async analyzeReceipt(
    image: { base64: string; mimeType: string },
    options?: { customInstructions?: string; signal?: AbortSignal },
  ): Promise<ReceiptItem[]> {
    const systemPrompt = buildSystemPrompt(options?.customInstructions || "");

    const imageDataUri = `data:${image.mimeType};base64,${image.base64}`;

    const body = {
      model: this.config.model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageDataUri,
                detail: "auto",
              },
            },
            {
              type: "text",
              text: "Please analyze this receipt.",
            },
          ],
        },
      ],
      max_tokens: this.config.maxTokens || 1024,
      temperature: 0.3,
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message || `HTTP ${response.status}`;

        if (response.status === 401 || response.status === 403) {
          throw new AIError("API key is invalid or expired", "AUTH_ERROR", {
            status: response.status,
          });
        }

        if (response.status === 404) {
          throw new AIError(
            `Model "${this.config.model}" not found`,
            "MODEL_NOT_FOUND",
            { status: response.status },
          );
        }

        throw new AIError(errorMessage, "API_ERROR", {
          status: response.status,
        });
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new AIError("No response content from API", "EMPTY_RESPONSE");
      }

      return parseReceiptResponse(content);
    } catch (error) {
      if (error instanceof AIError) throw error;
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new AIError("Request was cancelled", "CANCELLED");
        }
        throw new AIError(error.message, "NETWORK_ERROR");
      }
      throw new AIError("Unknown error", "UNKNOWN");
    }
  }

  async testConnection(): Promise<AITestResult> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: "API key is invalid or unauthorized",
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: Failed to connect to API`,
        };
      }

      const data = (await response.json()) as any;
      const models = data.data as any[] | undefined;

      if (!Array.isArray(models)) {
        return {
          success: false,
          error: "Unexpected response format from API",
        };
      }

      const hasModel = models.some((m) => m.id === this.config.model);
      if (!hasModel) {
        return {
          success: false,
          error: `Model "${this.config.model}" not available in this account`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
