import type { FrameMetrics } from "./frameMetrics";

export type GateThresholds = {
  minBrightness: number;
  maxBrightness: number;
  minSharpness: number;
  goodSharpness: number;
};

export const DEFAULT_THRESHOLDS: GateThresholds = {
  minBrightness: 30,
  maxBrightness: 235,
  minSharpness: 60,
  goodSharpness: 600,
};

export type GateResult = {
  passed: boolean;
  score: number;
  reason: "ok" | "too-dark" | "too-bright" | "blurry";
};

export function evaluateGate(
  metrics: FrameMetrics,
  t: GateThresholds = DEFAULT_THRESHOLDS,
): GateResult {
  "worklet";

  if (metrics.brightness < t.minBrightness) {
    return { passed: false, score: 0, reason: "too-dark" };
  }
  if (metrics.brightness > t.maxBrightness) {
    return { passed: false, score: 0, reason: "too-bright" };
  }
  if (metrics.sharpness < t.minSharpness) {
    return { passed: false, score: 0, reason: "blurry" };
  }

  const span = t.goodSharpness - t.minSharpness;
  const raw = span > 0 ? (metrics.sharpness - t.minSharpness) / span : 1;
  const score = raw < 0 ? 0 : raw > 1 ? 1 : raw;

  return { passed: true, score, reason: "ok" };
}
