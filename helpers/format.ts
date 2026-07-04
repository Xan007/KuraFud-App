import type { Nutriments } from "types";

/** Rounds a nullable number to 2 decimal places and returns it as a string. */
export function fmt(value: number | null): string {
  if (value == null) return "-";
  return parseFloat(value.toFixed(2)).toString();
}

/** Scales a per-100g value to a single serving. */
export function perServing(value100g: number, servingQty: number): number {
  return (value100g / 100) * servingQty;
}

/** Returns true when at least one nutriment field is non-null. */
export function hasNutriments(n: Nutriments): boolean {
  return Object.values(n).some((v) => v != null);
}

/**
 * Formats a `Date` instance to the local `DD/MM/YYYY` string used throughout
 * the app for expiration dates. Uses UTC to avoid timezone offset issues.
 */
export function formatDateString(date: Date): string {
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses a `DD/MM/YYYY` string back into a Date instance in UTC.
 * Hours, minutes, seconds are set to 00:00:00 UTC.
 */
export function parseDateString(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
