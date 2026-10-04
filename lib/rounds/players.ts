import type { ScorecardPlayer } from "@/types/round";

export const MAX_SCORECARD_PLAYERS = 4;

export function emptyScores(holeCount: number): Array<number | null> {
  return new Array(holeCount).fill(null);
}

function makePlayerId(): string {
  const maybeCrypto = globalThis as unknown as {
    crypto?: { randomUUID?: () => string };
  };
  if (maybeCrypto.crypto && typeof maybeCrypto.crypto.randomUUID === "function") {
    return maybeCrypto.crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createPlayer(name: string, holeCount: number): ScorecardPlayer {
  return {
    id: makePlayerId(),
    name: name.trim() || "Player",
    holeScoresStrokes: emptyScores(holeCount),
  };
}

export function defaultPlayers(holeCount: number): ScorecardPlayer[] {
  return [createPlayer("You", holeCount)];
}

export function padPlayerScores(
  players: ScorecardPlayer[],
  holeCount: number,
): ScorecardPlayer[] {
  return players.map((p) => ({
    ...p,
    holeScoresStrokes:
      p.holeScoresStrokes.length === holeCount
        ? p.holeScoresStrokes
        : emptyScores(holeCount).map((_, i) => p.holeScoresStrokes[i] ?? null),
  }));
}

/** Normalize players from a saved round (legacy single-array or multi). */
export function playersFromRound(
  holeScoresStrokes: Array<number | null>,
  players: ScorecardPlayer[] | undefined,
  holeCount: number,
): ScorecardPlayer[] {
  if (players?.length) {
    return padPlayerScores(players, holeCount);
  }
  const primary = createPlayer("You", holeCount);
  primary.holeScoresStrokes = emptyScores(holeCount).map(
    (_, i) => holeScoresStrokes[i] ?? null,
  );
  return [primary];
}

export function countEnteredHoles(scores: Array<number | null>): number {
  return scores.filter((v) => typeof v === "number" && Number.isFinite(v) && v >= 0).length;
}

export function anyScoresEntered(players: ScorecardPlayer[]): boolean {
  return players.some((p) => countEnteredHoles(p.holeScoresStrokes) > 0);
}

export function allPlayersComplete(players: ScorecardPlayer[], holeCount: number): boolean {
  return players.every(
    (p) =>
      p.holeScoresStrokes.length === holeCount &&
      p.holeScoresStrokes.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0),
  );
}
