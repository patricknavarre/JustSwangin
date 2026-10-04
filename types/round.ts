export type RoundId = string;

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

  /** 0-based index by holeNumber-1; null = not yet entered */
  holeScoresStrokes: Array<number | null>;

  totalPar: number;
  /** Sum of entered strokes only (null holes ignored). */
  totalStrokes: number;
  netToPar: number;
  /** True while the round is still being filled in on the scorecard. */
  inProgress?: boolean;
  updatedAtISO?: string;
}
