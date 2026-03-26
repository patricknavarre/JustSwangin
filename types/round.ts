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

  /** 0-based index by holeNumber-1 */
  holeScoresStrokes: number[];

  totalPar: number;
  totalStrokes: number;
  netToPar: number;
}
