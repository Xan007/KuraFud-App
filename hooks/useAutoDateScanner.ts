import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrameOutput } from "react-native-vision-camera";
import {
  useResizer,
  isResizerAvailable,
} from "react-native-vision-camera-resizer";
import { runOnJS } from "react-native-worklets";
import { computeFrameMetrics } from "@/services/ocr/frameMetrics";
import { evaluateGate, DEFAULT_THRESHOLDS } from "@/services/ocr/qualityGate";
import {
  createAutoScanner,
  type Candidate,
  type ScanProgress,
} from "@/services/ocr/autoScanner";

/** Down-scaled analysis resolution for the worklet quality gate. */
const GATE_SIZE = 160;

export type UseAutoDateScannerParams = {
  /** Captures + enhances one frame into an OCR-ready file (screen-provided). */
  captureCandidate: () => Promise<Candidate | null>;
  onAccepted: (date: string, photoPath: string) => void;
  onExhausted?: () => void;
};

export type UseAutoDateScanner = {
  /** Add this to the `<Camera outputs={[...]}>` array *only while scanning*. */
  frameOutput: ReturnType<typeof useFrameOutput>;
  start: () => void;
  stop: () => void;
  progress: ScanProgress | null;
};

/**
 * Wires the VisionCamera 5 frame pipeline to the offline OCR scanner.
 *
 * Frame Output (worklet) → Resizer (GPU downscale) → cheap brightness/sharpness
 * gate. When a frame passes, `runOnJS` hands control to the JS `AutoScanner`,
 * which captures a full photo, enhances it, runs ML Kit + regex, and votes.
 *
 * The worklet stays cheap (compute metrics on 160×160) so no asyncRunner is
 * needed. The `autoScanner` itself enforces throttling (minCaptureInterval,
 * 1 OCR in flight), so burstiness doesn't cause pile-up.
 *
 * If the GPU Resizer is unavailable on the device, we fall back to a plain JS
 * interval that drives the same scanner (no worklet gate) so the feature still
 * works everywhere.
 */
export function useAutoDateScanner({
  captureCandidate,
  onAccepted,
  onExhausted,
}: UseAutoDateScannerParams): UseAutoDateScanner {
  const [progress, setProgress] = useState<ScanProgress | null>(null);

  const gpuAvailable = useMemo(() => isResizerAvailable(), []);

  const { resizer, state: resizerState } = useResizer({
    width: GATE_SIZE,
    height: GATE_SIZE,
    channelOrder: "rgb",
    dataType: "uint8",
    scaleMode: "cover",
    pixelLayout: "interleaved",
  });

  // Keep the latest callbacks without re-creating the scanner every render.
  const captureRef = useRef(captureCandidate);
  const acceptedRef = useRef(onAccepted);
  const exhaustedRef = useRef(onExhausted);
  captureRef.current = captureCandidate;
  acceptedRef.current = onAccepted;
  exhaustedRef.current = onExhausted;

  const scanner = useMemo(
    () =>
      createAutoScanner({
        captureCandidate: () => captureRef.current(),
        onAccepted: (date, photo) => acceptedRef.current(date, photo),
        onExhausted: () => exhaustedRef.current?.(),
        onProgress: setProgress,
        onError: (e) => console.warn("[autoScanner]", e.message),
      }),
    [],
  );

  // JS entry point invoked from the worklet when a frame passes the gate.
  const submit = useCallback(
    (score: number) => {
      scanner.submit(score);
    },
    [scanner],
  );

  // Only build the frame output if the Resizer is ready (GPU path) or as
  // fallback (CPU path via setInterval). If Resizer state is still 'loading',
  // the worklet returns early without attempting to use it.
  const frameOutput = useFrameOutput({
    pixelFormat: "yuv",
    onFrame: (frame) => {
      "worklet";
      try {
        // GPU path: if Resizer is ready, use it for fast metrics.
        if (resizer != null && resizerState === "ready") {
          const resized = resizer.resize(frame);
          const pixels = new Uint8Array(resized.getPixelBuffer());
          const metrics = computeFrameMetrics(pixels, GATE_SIZE, GATE_SIZE);
          resized.dispose();

          const gate = evaluateGate(metrics, DEFAULT_THRESHOLDS);
          if (gate.passed) {
            runOnJS(submit)(gate.score);
          }
        }
      } finally {
        frame.dispose();
      }
    },
  });

  // CPU fallback: drive the scanner from JS when no GPU Resizer is present
  // (or not ready yet). This ensures the feature works on all devices.
  const fallbackTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setProgress(null);
    scanner.start();
    // Start the CPU fallback if GPU is unavailable or not yet ready.
    if (
      (!gpuAvailable || resizerState !== "ready") &&
      fallbackTimer.current == null
    ) {
      fallbackTimer.current = setInterval(() => scanner.submit(0.7), 150);
    }
  }, [scanner, gpuAvailable, resizerState]);

  const stop = useCallback(() => {
    scanner.stop();
    if (fallbackTimer.current) {
      clearInterval(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  }, [scanner]);

  useEffect(() => stop, [stop]);

  return { frameOutput, start, stop, progress };
}
