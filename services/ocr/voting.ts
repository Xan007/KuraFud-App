export type VotingConfig = {
  requiredVotes: number;
  leadMargin: number;
};

export const DEFAULT_VOTING: VotingConfig = {
  requiredVotes: 1.0,
  leadMargin: 0.5,
};

export type VoteState = {
  accepted: string | null;
  leader: string | null;
  leaderVotes: number;
  reads: number;
};

export type VoteBox = {
  add(date: string | null, weight?: number): VoteState;
  reset(): void;
};

export function createVoteBox(config: VotingConfig = DEFAULT_VOTING): VoteBox {
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
