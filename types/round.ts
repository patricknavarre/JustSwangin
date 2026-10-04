export type RoundId = string;

export interface ScorecardPlayer {
  id: string;
  name: string;
  /** 0-based index by holeNumber-1; null = not yet entered */
  holeScoresStrokes: Array<number | null>;
}

export interface SavedRound {
  id: RoundId;
  createdAtISO: string;
  courseId: string;
  courseName: string;
  city: string;
  state: string;
  country: string;
  teeId: string;
  teeName: string;

  /**
   * Primary player strokes (player index 0). Kept for backward compatibility
   * with Betting Tracker and older rounds.
   */
  holeScoresStrokes: Array<number | null>;

  /** All players on this card (includes primary). Optional on older saves. */
  players?: ScorecardPlayer[];

  totalPar: number;
  /** Sum of entered strokes for the primary player (null holes ignored). */
  totalStrokes: number;
  netToPar: number;
  /** True while the round is still being filled in on the scorecard. */
  inProgress?: boolean;
  updatedAtISO?: string;
}
