import type { ReceiptItem } from "./types";
import { AIError } from "./types";

const SYSTEM_PROMPT_BASE = `Eres un analizador de recibos. Extrae los productos comprados de la imagen del recibo.

Tu respuesta DEBE ser un objeto JSON válido con esta estructura exacta:
{
  "items": [
    {
      "name": "Nombre del producto",
      "quantity": number
    }
  ]
}

REGLAS ESTRICTAS:

1. **LEER EL FORMATO PRIMERO**: Antes de asignar cantidades, identifica cómo está estructurado el recibo. Algunos recibos listan cada producto individualmente (cantidad 1 cada uno aunque sean del mismo producto), otros usan una columna de cantidad explícita. NO asumas nada sin evidencias.

2. **CANTIDAD**:
   - Usa la cantidad SOLO si ves una columna numérica explícita junto al producto (ej: "2 × Leche" o "Leche ... 2" con separación clara).
   - Si el producto aparece una sola vez en el recibo, pon 1.
   - Si el recibo lista el mismo producto en varias líneas separadas, NO las sumes — cada línea es un ítem individual con cantidad 1.
   - Ante la menor duda sobre la cantidad, pon 1. No inventes.

3. **SIN INVENTAR**:
   - Extrae SOLO los productos que puedas leer claramente.
   - No agregues productos que no estén en el recibo.
   - Omite subtotales, impuestos, descuentos, totales, propinas, fees, y cualquier línea que no sea un producto.

4. **NOMBRES ABREVIADOS O ILEGIBLES**:
   - Si el nombre del producto viene abreviado en el recibo (ej: "LECHE S/" o "JGO. MANZ"), ponlo **exactamente como aparece**, no intentes adivinar o expandir la abreviatura.
   - Si no puedes leer una palabra completa, pon lo que alcances a ver. No inventes letras faltantes.
   - Si una línea completa no se entiende, mejor omítela antes que inventar.

4. **FORMATO DE SALIDA**:
   - name: texto claro y conciso (como aparece en el recibo).
   - quantity: número entero o decimal solo si estás completamente seguro.

Devuelve un array "items" vacío si no encuentras productos legibles.

IMPORTANTE: Devuelve ÚNICAMENTE el objeto JSON, sin texto adicional, sin marcas de código.`;

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
    throw new AIError("Failed to parse receipt data as JSON", "PARSE_ERROR", {
      rawResponse: cleaned,
    });
  }

  let list: unknown;
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray((parsed as Record<string, unknown>).items)
  ) {
    list = (parsed as Record<string, unknown>).items;
  } else {
    throw new AIError(
      'Receipt data must be an array or an object with an "items" array',
      "INVALID_FORMAT",
      { received: typeof parsed },
    );
  }

  const parsedList = list as unknown[];
  const items: ReceiptItem[] = [];

  for (let i = 0; i < parsedList.length; i++) {
    const item = parsedList[i];

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
