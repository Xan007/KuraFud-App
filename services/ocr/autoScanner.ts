import { recognizeText } from "./mlkitOcr";
import { detectDate } from "../dateDetection";
import { createVoteBox, DEFAULT_VOTING, type VotingConfig } from "./voting";

export type Candidate = {
  ocrPath: string;
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
  captureCandidate: () => Promise<Candidate | null>;
  onAccepted: (date: string, photoPath: string) => void;
  onExhausted?: () => void;
  onProgress?: (state: ScanProgress) => void;
  onError?: (error: Error) => void;
  minCaptureIntervalMs?: number;
  maxAttempts?: number;
  timeoutMs?: number;
  voting?: VotingConfig;
  continuous?: boolean;
};

export type AutoScanner = {
  start(): void;
  stop(): void;
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
    minCaptureIntervalMs = 60,
    maxAttempts = Infinity,
    timeoutMs = 4000,
    voting = { requiredVotes: 3.0, leadMargin: 0.5 },
    continuous = false,
  } = config;

  const votes = createVoteBox(voting);

  let running = false;
  let inFlight = false;
  let attempts = 0;
  let lastCaptureAt = 0;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let votingTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let hasDetectedDate = false;

  function clearTimer() {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  }

  function clearVotingTimer() {
    if (votingTimeoutTimer) {
      clearTimeout(votingTimeoutTimer);
      votingTimeoutTimer = null;
    }
  }

  function startVotingTimeout() {
    clearVotingTimer();
    votingTimeoutTimer = setTimeout(() => {
      if (running && hasDetectedDate) {
        votes.reset();
        hasDetectedDate = false;
      }
    }, timeoutMs);
  }

  function stop() {
    running = false;
    clearTimer();
    clearVotingTimer();
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

      if (date && !hasDetectedDate) {
        hasDetectedDate = true;
        startVotingTimeout();
      }

      const state = votes.add(date, qualityScore);
      report(
        date ? "voted" : "no-date",
        state.leader,
        state.leaderVotes,
        state.reads,
      );

      if (state.accepted) {
        onAccepted(state.accepted, candidate.photoPath);
        if (!continuous) {
          stop();
          return;
        }
        votes.reset();
        hasDetectedDate = false;
        clearVotingTimer();
        // Pausa post-acceptación para evitar re-detectarla inmediato
        // y que el leader se limpie para que el estado no se quede
        // en "Confirmando" cuando el usuario ya movió la cámara.
        lastCaptureAt = Date.now() + 600;
        report("voted", null, 0, 0);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    } finally {
      inFlight = false;
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
      hasDetectedDate = false;
      clearTimer();
      clearVotingTimer();
    },
    stop,
    submit,
    isRunning: () => running,
  };
}
