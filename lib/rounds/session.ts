export type ScorecardSession = {
  version: 1;
  courseId: string;
  teeId: string;
  activeRoundId: string | null;
  holeScoresStrokes: Array<number | null>;
  updatedAtISO: string;
};

const STORAGE_KEY = "justswangin-scorecard-session-v1";

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadScorecardSession(): ScorecardSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = safeParse<ScorecardSession>(raw);
  if (!parsed || parsed.version !== 1 || !parsed.courseId) return null;
  return parsed;
}

export function saveScorecardSession(session: Omit<ScorecardSession, "version" | "updatedAtISO">): void {
  if (typeof window === "undefined") return;
  const payload: ScorecardSession = {
    version: 1,
    updatedAtISO: new Date().toISOString(),
    ...session,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearScorecardSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
