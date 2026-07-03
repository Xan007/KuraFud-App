/**
 * Quality gate: decides whether a frame is worth the (expensive) capture +
 * ML Kit OCR round-trip.  Pure + worklet-safe so it can run on the frame
 * worklet thread AND on the JS thread (CPU fallback path).
 *
 * Tune the thresholds per device/lighting — they are intentionally exported.
 */

import type { FrameMetrics } from "./frameMetrics";

export type GateThresholds = {
  /** Reject frames darker than this mean luma (under-exposed). */
  minBrightness: number;
  /** Reject frames brighter than this mean luma (blown-out / glare). */
  maxBrightness: number;
  /** Reject frames below this sharpness (blurry / moving / out of focus). */
  minSharpness: number;
  /** Sharpness considered "excellent" — used to normalise the 0..1 score. */
  goodSharpness: number;
};

export const DEFAULT_THRESHOLDS: GateThresholds = {
  minBrightness: 55,
  maxBrightness: 225,
  minSharpness: 120,
  goodSharpness: 900,
};

export type GateResult = {
  passed: boolean;
  /** 0..1 confidence in the frame quality (used to weight votes). */
  score: number;
  reason: "ok" | "too-dark" | "too-bright" | "blurry";
};

/** Evaluates precomputed metrics against thresholds. */
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

  // Normalise sharpness into a 0..1 score.
  const span = t.goodSharpness - t.minSharpness;
  const raw = span > 0 ? (metrics.sharpness - t.minSharpness) / span : 1;
  const score = raw < 0 ? 0 : raw > 1 ? 1 : raw;

  return { passed: true, score, reason: "ok" };
}
