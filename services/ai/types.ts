export interface ReceiptItem {
  name: string;
  quantity: number;
}

export interface AITestResult {
  success: boolean;
  error?: string;
}

export interface AIProvider {
  analyzeReceipt(image: {
    base64: string;
    mimeType: string;
  }, options?: {
    customInstructions?: string;
    signal?: AbortSignal;
  }): Promise<ReceiptItem[]>;

  testConnection(): Promise<AITestResult>;
}

export type AIAdapter = "openai-compatible" | "gemini" | "anthropic";

export interface AIProviderDescriptor {
  id: string;
  name: string;
  adapter: AIAdapter;
  supportsCustomModel: boolean;
  models: Array<{
    id: string;
    name: string;
    supportsMaxTokens: boolean;
  }>;
}

export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "AIError";
  }
}
