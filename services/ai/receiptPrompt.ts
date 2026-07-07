import type { ReceiptItem } from "./types";
import { AIError } from "./types";

const SYSTEM_PROMPT_BASE = `You are a receipt analyzer. Extract the list of items purchased from the receipt image.

Your response MUST be a valid JSON array with this exact structure:
[
  {
    "name": "Product name",
    "quantity": number
  }
]

Rules:
- Extract only the actual purchased items (not subtotals, taxes, totals, or fees)
- "quantity" must be a number (e.g., 2, 1.5, 3)
- If quantity is not visible, assume 1
- Product name should be concise and clear
- Return an empty array [] if no items are found

IMPORTANT: Return ONLY the JSON array, no other text, no markdown code blocks.`;

export function buildSystemPrompt(customInstructions: string): string {
  if (!customInstructions.trim()) {
    return SYSTEM_PROMPT_BASE;
  }
  return `${SYSTEM_PROMPT_BASE}

Additional context from user:
${customInstructions}`;
}

export function parseReceiptResponse(rawText: string): ReceiptItem[] {
  const cleaned = rawText.trim();

  // Remove markdown code blocks if present
  let jsonText = cleaned;
  if (cleaned.startsWith("```json")) {
    jsonText = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    jsonText = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  jsonText = jsonText.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new AIError(
      "Failed to parse receipt data as JSON",
      "PARSE_ERROR",
      { rawResponse: cleaned },
    );
  }

  if (!Array.isArray(parsed)) {
    throw new AIError(
      "Receipt data must be an array",
      "INVALID_FORMAT",
      { received: typeof parsed },
    );
  }

  const items: ReceiptItem[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];

    if (typeof item !== "object" || item === null) {
      throw new AIError(
        `Item at index ${i} is not an object`,
        "INVALID_FORMAT",
        { item },
      );
    }

    const { name, quantity } = item as Record<string, unknown>;

    if (typeof name !== "string" || !name.trim()) {
      throw new AIError(
        `Item at index ${i} has invalid name (must be non-empty string)`,
        "INVALID_FORMAT",
        { item },
      );
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      throw new AIError(
        `Item at index ${i} has invalid quantity (must be positive number)`,
        "INVALID_FORMAT",
        { item },
      );
    }

    items.push({
      name: name.trim(),
      quantity,
    });
  }

  return items;
}
