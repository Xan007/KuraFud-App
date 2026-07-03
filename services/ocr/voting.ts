/**
 * Consensus voting across multiple OCR readings.
 *
 * A single frame can misread `8` as `B`, drop a digit, etc.  Instead of
 * trusting one capture, we accumulate weighted votes per detected date and only
 * accept once a candidate is clearly ahead — this is what makes the automatic
 * reading reliable.
 */

export type VotingConfig = {
  /** Weighted votes a date needs before it can be accepted. */
  requiredVotes: number;
  /** How far ahead of the runner-up the leader must be. */
  leadMargin: number;
};

export const DEFAULT_VOTING: VotingConfig = {
  requiredVotes: 3.5,
  leadMargin: 1.5,
};

export type VoteState = {
  /** The accepted date, or `null` if consensus is not reached yet. */
  accepted: string | null;
  /** Current front-runner (may not be accepted yet). */
  leader: string | null;
  leaderVotes: number;
  /** How many readings produced a date so far. */
  reads: number;
};

export type VoteBox = {
  /**
   * Registers one reading.
   * @param date   Detected date (`DD/MM/YYYY`) or `null` if none was found.
   * @param weight Vote weight, typically the frame quality score (0..1). A
   *               small floor keeps every valid read meaningful.
   */
  add(date: string | null, weight?: number): VoteState;
  reset(): void;
};

export function createVoteBox(
  config: VotingConfig = DEFAULT_VOTING,
): VoteBox {
  const tally = new Map<string, number>();
  let reads = 0;

  function snapshot(): VoteState {
    let leader: string | null = null;
    let leaderVotes = 0;
    let secondVotes = 0;

    for (const [date, votes] of tally) {
      if (votes > leaderVotes) {
        secondVotes = leaderVotes;
        leaderVotes = votes;
        leader = date;
      } else if (votes > secondVotes) {
        secondVotes = votes;
      }
    }

    const accepted =
      leader !== null &&
      leaderVotes >= config.requiredVotes &&
      leaderVotes - secondVotes >= config.leadMargin
        ? leader
        : null;

    return { accepted, leader, leaderVotes, reads };
  }

  return {
    add(date, weight = 1) {
      if (date) {
        reads++;
        // Clamp weight into a sensible [0.5, 1.5] band so quality nudges, not
        // dominates, the tally.
        const w = weight < 0.5 ? 0.5 : weight > 1.5 ? 1.5 : weight;
        tally.set(date, (tally.get(date) ?? 0) + w);
      }
      return snapshot();
    },
    reset() {
      tally.clear();
      reads = 0;
    },
  };
}
