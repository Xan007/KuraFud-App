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
  if (!value) return new Date(8640000000000000);
  const [day, month, year] = value.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function isExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  const expDate = parseDateString(dateStr);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return expDate < today;
}


export function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  const expDate = parseDateString(dateStr);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export type TimeUntil =
  | { kind: "expired"; days: number }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "pastDays"; count: number }
  | { kind: "days"; count: number }
  | { kind: "months"; count: number }
  | { kind: "years"; count: number };


export function timeUntil(dateStr: string): TimeUntil {
  if (!dateStr) return { kind: "years", count: 0 };
  const d = daysUntil(dateStr);
  if (d < 0) {
    return { kind: "pastDays", count: Math.abs(d) };
  }
  if (d === 0) return { kind: "today" };
  if (d === 1) return { kind: "tomorrow" };
  if (d <= 30) return { kind: "days", count: d };
  if (d < 365) {
    const months = Math.round(d / 30);
    if (months < 1) return { kind: "days", count: d };
    return { kind: "months", count: months };
  }
  const years = Math.round(d / 365);
  return { kind: "years", count: years };
}


export function expiryTone(dateStr: string): "expired" | "soon" | "ok" {
  if (!dateStr) return "ok";
  const d = daysUntil(dateStr);
  if (d < 0) return "expired";
  if (d <= 7) return "soon";
  return "ok";
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): string {
  const r = lerp(c1[0], c2[0], t);
  const g = lerp(c1[1], c2[1], t);
  const b = lerp(c1[2], c2[2], t);
  return `rgb(${r},${g},${b})`;
}

const RED: [number, number, number] = [239, 68, 68];
const AMBER: [number, number, number] = [245, 158, 11];
const GREEN: [number, number, number] = [34, 197, 94];


export function expiryBarColor(dateStr: string): string {
  if (!dateStr) return "rgba(0,0,0,0)";
  const d = daysUntil(dateStr);
  if (d < 0) return lerpColor(RED, RED, 0);
  if (d === 0) return lerpColor(RED, RED, 0);
  if (d <= 7) {
    const t = d / 7;
    return lerpColor(RED, AMBER, t);
  }
  if (d <= 30) {
    const t = (d - 7) / 23;
    return lerpColor(AMBER, GREEN, t);
  }
  return lerpColor(GREEN, GREEN, 0);
}


export function formatPercent(ratio: number): string {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return `${Math.round(pct)}%`;
}
