import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createAutoScanner,
  type Candidate,
  type ScanProgress,
} from "@/services/ocr/autoScanner";

const TIMER_INTERVAL_MS = 200;

export type UseAutoDateScannerParams = {
  captureCandidate: () => Promise<Candidate | null>;
  onAccepted: (date: string, photoPath: string) => void;
  onExhausted?: () => void;
  continuous?: boolean;
};

export type UseAutoDateScanner = {
  start: () => void;
  stop: () => void;
  progress: ScanProgress | null;
};

export function useAutoDateScanner({
  captureCandidate,
  onAccepted,
  onExhausted,
  continuous = false,
}: UseAutoDateScannerParams): UseAutoDateScanner {
  const [progress, setProgress] = useState<ScanProgress | null>(null);

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
        continuous,
      }),
    [continuous],
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setProgress(null);
    scanner.start();
    if (timerRef.current == null) {
      timerRef.current = setInterval(() => scanner.submit(0.8), TIMER_INTERVAL_MS);
    }
  }, [scanner]);

  const stop = useCallback(() => {
    scanner.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [scanner]);

  useEffect(() => stop, [stop]);

  return { start, stop, progress };
}
