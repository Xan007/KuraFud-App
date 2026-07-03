import { recognizeText } from "./mlkitOcr";
import { detectDate } from "../dateDetection";
import { createVoteBox, DEFAULT_VOTING, type VotingConfig } from "./voting";

/**
 * Orchestrates the *validation* half of the automatic OCR pipeline, decoupled
 * from React and the camera.
 *
 * The camera/worklet side decides **when** a frame is good and calls
 * {@link AutoScanner.submit}.  This module then, for each accepted trigger:
 *   capture+enhance (injected) → ML Kit OCR → regex date → weighted vote →
 * accept when the reading is stable, or give up after a timeout / attempt cap.
 *
 * It guards a single in-flight OCR and a minimum interval between captures so
 * bursts of good frames don't pile up work.
 */

export type Candidate = {
  /** Enhanced, OCR-ready image path. */
  ocrPath: string;
  /** Original photo path to keep as the stored evidence / preview. */
  photoPath: string;
};

export type ScanProgress = {
  reads: number;
  attempts: number;
  leader: string | null;
  leaderVotes: number;
  lastReason: "captured" | "no-text" | "no-date" | "voted" | "skipped";
};

export type AutoScannerConfig = {
  /** Captures a frame and returns an enhanced OCR file (or null on failure). */
  captureCandidate: () => Promise<Candidate | null>;
  onAccepted: (date: string, photoPath: string) => void;
  onExhausted?: () => void;
  onProgress?: (state: ScanProgress) => void;
  onError?: (error: Error) => void;
  minCaptureIntervalMs?: number;
  maxAttempts?: number;
  timeoutMs?: number;
  voting?: VotingConfig;
};

export type AutoScanner = {
  start(): void;
  stop(): void;
  /** Called (from JS) whenever the worklet gate reports a good frame. */
  submit(qualityScore: number): void;
  isRunning(): boolean;
};

export function createAutoScanner(config: AutoScannerConfig): AutoScanner {
  const {
    captureCandidate,
    onAccepted,
    onExhausted,
    onProgress,
    onError,
    minCaptureIntervalMs = 150,
    maxAttempts = 8,
    timeoutMs = 10000,
    voting = { requiredVotes: 2.5, leadMargin: 1.0 },
  } = config;

  const votes = createVoteBox(voting);

  let running = false;
  let inFlight = false;
  let attempts = 0;
  let lastCaptureAt = 0;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  }

  function stop() {
    running = false;
    clearTimer();
  }

  function report(
    reason: ScanProgress["lastReason"],
    leader: string | null,
    leaderVotes: number,
    reads: number,
  ) {
    onProgress?.({ reads, attempts, leader, leaderVotes, lastReason: reason });
  }

  async function submit(qualityScore: number) {
    if (!running || inFlight) return;

    const now = Date.now();
    if (now - lastCaptureAt < minCaptureIntervalMs) return;

    inFlight = true;
    lastCaptureAt = now;
    attempts++;

    try {
      const candidate = await captureCandidate();
      if (!running) return;

      if (!candidate) {
        report("skipped", null, 0, votes.add(null).reads);
        return;
      }

      const text = await recognizeText(candidate.ocrPath);
      if (!running) return;

      if (!text) {
        const s = votes.add(null);
        report("no-text", s.leader, s.leaderVotes, s.reads);
        return;
      }

      const date = detectDate(text);
      const state = votes.add(date, qualityScore);
      report(
        date ? "voted" : "no-date",
        state.leader,
        state.leaderVotes,
        state.reads,
      );

      if (state.accepted) {
        stop();
        onAccepted(state.accepted, candidate.photoPath);
        return;
      }
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    } finally {
      inFlight = false;
      if (running && attempts >= maxAttempts) {
        stop();
        onExhausted?.();
      }
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      inFlight = false;
      attempts = 0;
      lastCaptureAt = 0;
      votes.reset();
      clearTimer();
      timeoutTimer = setTimeout(() => {
        if (running) {
          stop();
          onExhausted?.();
        }
      }, timeoutMs);
    },
    stop,
    submit,
    isRunning: () => running,
  };
}
