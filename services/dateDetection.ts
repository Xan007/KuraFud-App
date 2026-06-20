import TextRecognition from "@react-native-ml-kit/text-recognition";
import { File } from "expo-file-system";
import { GROQ_API_KEY } from "@/constants/config";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function normalize(value: string, length: 2 | 4): string {
  return value.padStart(length, "0");
}

function isValidDate(day: number, month: number): boolean {
  return day >= 1 && day <= 31 && month >= 1 && month <= 12;
}

function formatDate(day: string, month: string, year: string): string {
  return `${normalize(day, 2)}/${normalize(month, 2)}/${year}`;
}

/* -------------------------------------------------------------------------- */
/*  Regex-based date extraction                                               */
/* -------------------------------------------------------------------------- */

/** Attempts to find a date in numeric formats inside `text`. */
function tryRegex(text: string): string | null {
  const withSep = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/;
  let m = text.match(withSep);
  if (m) {
    let year = normalize(m[3], 4);
    if (m[3].length === 2) year = "20" + year;
    if (isValidDate(+m[1], +m[2])) {
      return formatDate(m[1], m[2], year);
    }
  }

  const concat8 = /\b(\d{2})(\d{2})(\d{4})\b/;
  m = text.match(concat8);
  if (m && isValidDate(+m[1], +m[2])) {
    return formatDate(m[1], m[2], m[3]);
  }

  const concat6 = /\b(\d{2})(\d{2})(\d{2})\b/g;
  while ((m = concat6.exec(text)) !== null) {
    const year = "20" + m[3];
    if (isValidDate(+m[1], +m[2]) && +year >= 2020 && +year <= 2099) {
      return formatDate(m[1], m[2], year);
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Spanish month names                                                       */
/* -------------------------------------------------------------------------- */

const SPANISH_MONTHS: Record<string, number> = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
  ENE: 1,
  FEB: 2,
  MAR: 3,
  ABR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DIC: 12,
};

function getLastDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/** Looks for dates written in Spanish (e.g. "27 DIC 2026", "DICIEMBRE 2026"). */
function trySpanishDate(text: string): string | null {
  const sorted = Object.keys(SPANISH_MONTHS).sort(
    (a, b) => b.length - a.length,
  );
  const pattern =
    `\\b` +
    `(?:(\\d{1,2})\\s+)?` +
    `(${sorted.join("|")})` +
    `[\\s/]+` +
    `(\\d{2,4})\\b`;
  const re = new RegExp(pattern, "i");
  const m = text.match(re);
  if (!m) return null;

  const monthStr = m[2].toUpperCase();
  const month = SPANISH_MONTHS[monthStr];
  if (!month) return null;

  const raw = m[1];
  const year = normalize(m[3], 4);

  if (raw) {
    const day = parseInt(raw);
    if (day >= 1 && day <= 31) {
      return formatDate(raw, String(month), year);
    }
  }

  const lastDay = getLastDayOfMonth(month, parseInt(year));
  return formatDate(String(lastDay), String(month), year);
}

/* -------------------------------------------------------------------------- */
/*  Groq Vision fallback                                                      */
/* -------------------------------------------------------------------------- */

function buildVisionPrompt(): string {
  return `Eres un experto en leer fechas de vencimiento de empaques de alimentos colombianos.

Mira la imagen del empaque y extrae SOLO la fecha de vencimiento del producto.

Busca palabras clave como: Vence, Vencimiento, FV, Expiry, Best before, Consumir antes de, Valido hasta, VT, VTO, Fecha de caducidad, Caduca.

La fecha puede estar en varios formatos:
- Numerico: 15/08/2026, 15-08-26, 15082026
- Mes abreviado: DIC 2026, 15 DIC 2026
- Mes completo: diciembre 2026, 15 de diciembre de 2026

Reglas:
- Convierte meses abreviados (ENE, FEB, MAR, ABR, MAY, JUN, JUL, AGO, SEP, OCT, NOV, DIC) a numero.
- Si solo viene mes y ano, usa el ULTIMO DIA del mes (ej: DIC 2026 -> 31/12/2026).
- Si hay varias fechas, prioriza la que tenga palabras clave de vencimiento.
- IGNORA: fecha de fabricacion, numero de lote, RUC, NIT, codigo de barras, pesos, precios.
- Si no hay una fecha de vencimiento clara, responde null.

Responde UNICAMENTE con un objeto JSON en una sola linea, sin explicacion:
{"date": "DD/MM/YYYY"} o {"date": null}`;
}

async function tryGroqVision(dataUrl: string): Promise<string | null> {
  if (!GROQ_API_KEY) return null;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildVisionPrompt() },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[GroqVision] HTTP", res.status, text.slice(0, 500));
      return null;
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    try {
      const parsed = JSON.parse(content);
      return parsed?.date ?? null;
    } catch {
      const extracted = tryRegex(content) || trySpanishDate(content);
      return extracted;
    }
  } catch (e) {
    console.warn("[GroqVision] fallo:", e);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  MLKit + Regex pipeline                                                    */
/* -------------------------------------------------------------------------- */

type MlKitOutcome =
  | { date: string; textRead: true }
  | { date: null; textRead: true }
  | { date: null; textRead: false };

async function tryMlKit(photoPath: string): Promise<MlKitOutcome> {
  const uris: string[] = [];
  if (photoPath.startsWith("file://")) {
    uris.push(photoPath);
    uris.push(photoPath.replace(/^file:\/\//, ""));
  } else {
    uris.push("file://" + photoPath);
    uris.push(photoPath);
  }

  for (const imageUri of uris) {
    try {
      const result = await TextRecognition.recognize(imageUri);
      const text = result.text.trim();

      if (text) {
        const found = tryRegex(text) || trySpanishDate(text);
        if (found) {
          return { date: found, textRead: true };
        }
        return { date: null, textRead: true };
      } else {
        return { date: null, textRead: false };
      }
    } catch {
      continue;
    }
  }

  return { date: null, textRead: false };
}

/* -------------------------------------------------------------------------- */
/*  Groq Vision fallback                                                      */
/* -------------------------------------------------------------------------- */

function arrayBufferToDataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

async function tryGroqFallback(photoPath: string): Promise<string | null> {
  try {
    const fullUri = photoPath.startsWith("file://")
      ? photoPath
      : "file://" + photoPath;

    const file = new File(fullUri);
    const arrayBuffer = await file.arrayBuffer();
    const dataUrl = arrayBufferToDataUrl(arrayBuffer);

    if (dataUrl.length > 3.8 * 1024 * 1024) {
      return null;
    }

    return tryGroqVision(dataUrl);
  } catch (e) {
    console.warn("[detectDate] Error leyendo archivo para Groq:", e);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Detects an expiration date from a photo file.
 *
 * Pipeline:
 * 1. **MLKit** extracts text → **regex** searches for numeric / Spanish dates.
 * 2. If MLKit found no date, **Groq Vision** analyses the image as a fallback.
 *
 * @param photoPath - Absolute file path (may include `file://` prefix).
 * @returns The date in `DD/MM/YYYY` format, or `null` if nothing was detected.
 */
export async function detectDateFromPhoto(
  photoPath: string,
): Promise<string | null> {
  const result = await tryMlKit(photoPath);
  if (result.date) return result.date;

  return tryGroqFallback(photoPath);
}
