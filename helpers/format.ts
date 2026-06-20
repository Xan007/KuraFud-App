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
 * the app for expiration dates.
 */
export function formatDateString(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
