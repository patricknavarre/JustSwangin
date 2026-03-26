import type { RoundId } from "@/types/round";

export type BettingFormat = "nassau" | "skins" | "wolf" | "stableford" | "matchplay";

export type BettingPlayerDraft = {
  name: string;
  holeStrokes: Array<number | null>;
  selectedRoundId: RoundId | null;
  handicap?: number;
};

export type BettingDraft = {
  version: 1;
  selectedCourseId: string;
  selectedTeeId: string;
  playersCount: number;
  players: BettingPlayerDraft[];

  format: BettingFormat;
  skinsCarryover: boolean;

  stakePerHole: number;
  stakeFront9: number;
  stakeBack9: number;
  stakeOverall: number;
};

const STORAGE_KEY = "justswangin-betting-draft-v1";

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadBettingDraft(): BettingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return safeParse<BettingDraft>(raw);
}

export function saveBettingDraft(draft: BettingDraft): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearBettingDraft(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

