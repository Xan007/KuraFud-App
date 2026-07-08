import type { AIProvider } from "./types";
import { AIError } from "./types";
import { OpenAICompatibleProvider } from "./adapters/openaiCompatible";
import { GeminiProvider } from "./adapters/gemini";
import { AnthropicProvider } from "./adapters/anthropic";
import { getProviderById } from "./registry";

interface AIClientConfig {
  providerId: string;
  model: string;
  apiKey: string;
  maxTokens?: number;
  customApiUrl?: string;
}

export function createAIClient(config: AIClientConfig): AIProvider {
  if (!config.providerId || !config.model || !config.apiKey) {
    throw new AIError(
      "Missing required configuration (providerId, model, apiKey)",
      "CONFIG_ERROR",
    );
  }

  const providerDescriptor = getProviderById(config.providerId);
  if (!providerDescriptor) {
    throw new AIError(
      `Unknown provider: ${config.providerId}`,
      "CONFIG_ERROR",
    );
  }

  switch (providerDescriptor.adapter) {
    case "openai-compatible": {
      const baseUrl = getBaseUrl(config.providerId, config.customApiUrl);
      return new OpenAICompatibleProvider({
        apiKey: config.apiKey,
        baseUrl,
        model: config.model,
        maxTokens: config.maxTokens,
      });
    }

    case "gemini": {
      return new GeminiProvider({
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config.maxTokens,
      });
    }

    case "anthropic": {
      return new AnthropicProvider({
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config.maxTokens,
      });
    }

    default:
      throw new AIError(
        `Unsupported adapter: ${providerDescriptor.adapter}`,
        "CONFIG_ERROR",
      );
  }
}

function getBaseUrl(providerId: string, customUrl?: string): string {
  const baseUrls: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    xai: "https://api.x.ai/v1",
    openrouter: "https://openrouter.ai/api/v1",
    together: "https://api.together.xyz/v1",
    groq: "https://api.groq.com/openai/v1",
    huggingface: "https://api-inference.huggingface.co/v1",
    fireworks: "https://api.fireworks.ai/inference/v1",
    deepinfra: "https://api.deepinfra.com/v1/openai",
    mistral: "https://api.mistral.ai/v1",
    custom: customUrl || "",
  };

  const url = baseUrls[providerId];
  if (!url) {
    throw new AIError(
      `No base URL found for provider: ${providerId}`,
      "CONFIG_ERROR",
    );
  }

  return url;
}
