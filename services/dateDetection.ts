import TextRecognition from "@react-native-ml-kit/text-recognition";

function normalize(value: string, length: 2 | 4): string {
  return value.padStart(length, "0");
}

function isValidDate(day: number, month: number): boolean {
  return day >= 1 && day <= 31 && month >= 1 && month <= 12;
}

function formatDate(day: string, month: string, year: string): string {
  return `${normalize(day, 2)}/${normalize(month, 2)}/${year}`;
}

export function tryRegex(text: string): string | null {
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

export function trySpanishDate(text: string): string | null {
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

export function detectDate(text: string): string | null {
  return tryRegex(text) || trySpanishDate(text);
}

export async function detectDateFromPhoto(
  photoPath: string,
): Promise<string | null> {
  const uris: string[] = [];
  if (photoPath.startsWith("file://")) {
    uris.push(photoPath, photoPath.replace(/^file:\/\//, ""));
  } else {
    uris.push("file://" + photoPath, photoPath);
  }

  for (const imageUri of uris) {
    try {
      const result = await TextRecognition.recognize(imageUri);
      const text = result.text.trim();
      if (text) return detectDate(text);
    } catch {
      continue;
    }
  }

  return null;
}
