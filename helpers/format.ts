import type { Nutriments } from "types";

export function fmt(value: number | null): string {
  if (value == null) return "-";
  return parseFloat(value.toFixed(2)).toString();
}

export function perServing(value100g: number, servingQty: number): number {
  return (value100g / 100) * servingQty;
}

export function hasNutriments(n: Nutriments): boolean {
  return Object.values(n).some((v) => v != null);
}

export function formatDateString(date: Date): string {
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function parseDateString(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
