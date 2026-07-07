import type { AIProvider, ReceiptItem, AITestResult } from "../types";
import { AIError } from "../types";
import { buildSystemPrompt, parseReceiptResponse } from "../receiptPrompt";

interface AnthropicConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
}

export class AnthropicProvider implements AIProvider {
  private config: AnthropicConfig;
  private baseUrl = "https://api.anthropic.com/v1";
  private apiVersion = "2024-06-01";

  constructor(config: AnthropicConfig) {
    this.config = config;
  }

  async analyzeReceipt(
    image: { base64: string; mimeType: string },
    options?: { customInstructions?: string; signal?: AbortSignal },
  ): Promise<ReceiptItem[]> {
    const systemPrompt = buildSystemPrompt(options?.customInstructions || "");

    const body = {
      model: this.config.model,
      max_tokens: this.config.maxTokens || 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mimeType,
                data: image.base64,
              },
            },
            {
              type: "text",
              text: "Please analyze this receipt.",
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": this.apiVersion,
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
          throw new AIError(
            "API key is invalid or expired",
            "AUTH_ERROR",
            { status: response.status },
          );
        }

        if (response.status === 404) {
          throw new AIError(
            `Model "${this.config.model}" not found`,
            "MODEL_NOT_FOUND",
            { status: response.status },
          );
        }

        const errorMessage =
          errorData.error?.message || `HTTP ${response.status}`;
        throw new AIError(errorMessage, "API_ERROR", { status: response.status });
      }

      const data = (await response.json()) as any;
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new AIError(
          "No response content from API",
          "EMPTY_RESPONSE",
        );
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
      const body = {
        model: this.config.model,
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: "Test",
          },
        ],
      };

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": this.apiVersion,
        },
        body: JSON.stringify(body),
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

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
