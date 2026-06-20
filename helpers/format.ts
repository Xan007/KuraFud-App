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
