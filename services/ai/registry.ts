import type { AIProviderDescriptor } from "./types";

export const AI_PROVIDERS: Record<string, AIProviderDescriptor> = {
  "google-gemini": {
    id: "google-gemini",
    name: "Google Gemini",
    adapter: "gemini",
    supportsCustomModel: false,
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", supportsMaxTokens: true },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", supportsMaxTokens: true },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", supportsMaxTokens: true },
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    adapter: "openai-compatible",
    supportsCustomModel: false,
    models: [
      { id: "gpt-4o", name: "GPT-4o", supportsMaxTokens: true },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", supportsMaxTokens: true },
      { id: "gpt-4-vision", name: "GPT-4 Vision", supportsMaxTokens: true },
    ],
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    adapter: "anthropic",
    supportsCustomModel: false,
    models: [
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", supportsMaxTokens: true },
      { id: "claude-3-opus-20250219", name: "Claude 3 Opus", supportsMaxTokens: true },
      { id: "claude-3-haiku-20250307", name: "Claude 3 Haiku", supportsMaxTokens: true },
    ],
  },
  xai: {
    id: "xai",
    name: "xAI Grok",
    adapter: "openai-compatible",
    supportsCustomModel: false,
    models: [
      { id: "grok-2-vision-1212", name: "Grok 2 Vision", supportsMaxTokens: true },
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    adapter: "openai-compatible",
    supportsCustomModel: true,
    models: [
      { id: "openai/gpt-4-vision", name: "OpenAI GPT-4 Vision", supportsMaxTokens: true },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", supportsMaxTokens: true },
      { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (free)", supportsMaxTokens: true },
    ],
  },
  together: {
    id: "together",
    name: "Together AI",
    adapter: "openai-compatible",
    supportsCustomModel: false,
    models: [
      { id: "meta-llama/Llama-3-11b-vision-instruct", name: "Llama 3.2 Vision", supportsMaxTokens: true },
      { id: "meta-llama/Llama-2-7b-chat", name: "Llama 2 7B", supportsMaxTokens: false },
    ],
  },
  groq: {
    id: "groq",
    name: "Groq",
    adapter: "openai-compatible",
    supportsCustomModel: false,
    models: [
      { id: "llama-3.2-90b-vision-preview", name: "Llama 3.2 90B Vision", supportsMaxTokens: true },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", supportsMaxTokens: false },
    ],
  },
  huggingface: {
    id: "huggingface",
    name: "Hugging Face",
    adapter: "openai-compatible",
    supportsCustomModel: true,
    models: [
      { id: "meta-llama/Llama-3.2-11B-Vision-Instruct", name: "Llama 3.2 Vision", supportsMaxTokens: true },
      { id: "HuggingFaceM4/idefics2-8b-AWQ", name: "Idefics2 8B", supportsMaxTokens: false },
    ],
  },
  fireworks: {
    id: "fireworks",
    name: "Fireworks AI",
    adapter: "openai-compatible",
    supportsCustomModel: false,
    models: [
      { id: "accounts/fireworks/models/llama-v3p2-90b-vision-instruct", name: "Llama 3.2 90B Vision", supportsMaxTokens: true },
    ],
  },
  deepinfra: {
    id: "deepinfra",
    name: "DeepInfra",
    adapter: "openai-compatible",
    supportsCustomModel: false,
    models: [
      { id: "meta-llama/Llama-3.2-90b-vision-instruct", name: "Llama 3.2 90B Vision", supportsMaxTokens: true },
    ],
  },
  mistral: {
    id: "mistral",
    name: "Mistral",
    adapter: "openai-compatible",
    supportsCustomModel: false,
    models: [
      { id: "pixtral-12b", name: "Pixtral 12B", supportsMaxTokens: true },
      { id: "mistral-small", name: "Mistral Small", supportsMaxTokens: false },
    ],
  },
  custom: {
    id: "custom",
    name: "Personalizado (compatible OpenAI)",
    adapter: "openai-compatible",
    supportsCustomModel: true,
    models: [],
  },
};

export function getProviderById(id: string): AIProviderDescriptor | null {
  return AI_PROVIDERS[id] ?? null;
}

export function getAllProviders(): AIProviderDescriptor[] {
  return Object.values(AI_PROVIDERS);
}
