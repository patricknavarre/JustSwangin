export type SgCategory = "offTee" | "approach" | "aroundGreen" | "putting";

export type SgOutcome =
  | "fairway"
  | "rough"
  | "longRough"
  | "hazardRecovery"
  | "penalty"
  | "greenInReg"
  | "nearGreen"
  | "missApproach"
  | "bunkerApproach"
  | "upAndDown"
  | "proximity"
  | "chipToFringe"
  | "missAround"
  | "approachPenalty"
  | "onePutts"
  | "twoPutts"
  | "threePlusPutts"
  | "missedShortPutt";

export type SgLogEntry = {
  id: string;
  createdAtISO: string;
  offTeeOutcome?: SgOutcome;
  approachOutcome?: SgOutcome;
  aroundGreenOutcome?: SgOutcome;
  puttingOutcome?: SgOutcome;
  note?: string;
};

const STORAGE_KEY = "justswangin-strokes-gained-v1";

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadSgLogs(): SgLogEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return safeParse<SgLogEntry[]>(raw) ?? [];
}

export function saveSgLogs(logs: SgLogEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function clearSgLogs(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

