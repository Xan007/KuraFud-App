import { useCallback, useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";

const DEFAULT_IDLE_TIMEOUT_MS = 10000;
const DEFAULT_COUNTDOWN_VISIBLE_MS = 5000;
const TICK_INTERVAL_MS = 250;

export type DateCountdownConfig = {
  idleTimeoutMs?: number;
  countdownVisibleMs?: number;
  onTimeout?: () => void;
};


export function useDateCountdown({
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  countdownVisibleMs = DEFAULT_COUNTDOWN_VISIBLE_MS,
  onTimeout,
}: DateCountdownConfig = {}) {
  const [active, setActive] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  const lastActivityRef = useRef(0);
  const vibratedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    vibratedRef.current = false;
    lastActivityRef.current = Date.now();
    setCountdownSeconds(null);
  }, []);

  useEffect(() => {
    if (!active) {
      reset();
      return;
    }

    lastActivityRef.current = Date.now();
    vibratedRef.current = false;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= idleTimeoutMs) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setCountdownSeconds(null);
        onTimeoutRef.current?.();
        return;
      }

      if (elapsed >= idleTimeoutMs - countdownVisibleMs) {
        const remaining = Math.ceil((idleTimeoutMs - elapsed) / 1000);
        setCountdownSeconds(remaining);

        if (!vibratedRef.current) {
          vibratedRef.current = true;
          Vibration.vibrate(200);
        }
      } else {
        setCountdownSeconds(null);
      }
    }, TICK_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, idleTimeoutMs, countdownVisibleMs, reset]);

  return {
    active,
    setActive,
    countdownSeconds,
    bumpActivity,
    reset,
  };
}
